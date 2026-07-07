jest.mock('../services/token');
jest.mock('../src/prisma-client', () => ({
  getPrismaWithUser: jest.fn(() => ({ usuario: {} })),
}));

const tokenServices = require('../services/token');
const { getPrismaWithUser } = require('../src/prisma-client');
const auth = require('../src/middleware/auth');

const mockReq = (overrides = {}) => ({
  headers: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ─── verificarUsuario ─────────────────────────────────────────────────────────
describe('verificarUsuario', () => {
  it('retorna 401 si no hay token', async () => {
    const res = mockRes();
    await auth.verificarUsuario(mockReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('retorna 403 si el token está vencido', async () => {
    tokenServices.decode.mockResolvedValue('token vencido');
    const res = mockRes();
    await auth.verificarUsuario(mockReq({ headers: { token: 'expired' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('retorna 403 si el rol no está permitido', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Leo', rol: 'lumira' });
    const res = mockRes();
    await auth.verificarUsuario(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('llama next() y adjunta req.prisma si token y rol son válidos', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Leo', rol: 'administrador' });
    const req = mockReq({ headers: { token: 'valid' } });
    const res = mockRes();
    await auth.verificarUsuario(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(req.prisma).toBeDefined();
    expect(getPrismaWithUser).toHaveBeenCalledWith('Leo');
  });

  it('acepta el token vía header Authorization: Bearer xxx', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Leo', rol: 'administrador' });
    const req = mockReq({ headers: { authorization: 'Bearer jwt-valido' } });
    const res = mockRes();
    await auth.verificarUsuario(req, res, mockNext);
    // Debe extraer solo el token, sin el prefijo "Bearer "
    expect(tokenServices.decode).toHaveBeenCalledWith('jwt-valido');
    expect(mockNext).toHaveBeenCalled();
  });

  it('retorna 401 si Authorization no tiene prefijo Bearer y no hay header token', async () => {
    const res = mockRes();
    await auth.verificarUsuario(
      mockReq({ headers: { authorization: 'jwt-sin-prefijo' } }),
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(tokenServices.decode).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('retorna 401 si el header token es string vacío', async () => {
    const res = mockRes();
    await auth.verificarUsuario(mockReq({ headers: { token: '' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(tokenServices.decode).not.toHaveBeenCalled();
  });

  it('retorna 401 si Authorization es solo "Bearer " (token vacío tras el prefijo)', async () => {
    const res = mockRes();
    await auth.verificarUsuario(
      mockReq({ headers: { authorization: 'Bearer ' } }),
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('el header Authorization con Bearer tiene prioridad sobre el header token', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Leo', rol: 'administrador' });
    const req = mockReq({ headers: { authorization: 'Bearer token-bearer', token: 'token-legacy' } });
    const res = mockRes();
    await auth.verificarUsuario(req, res, mockNext);
    expect(tokenServices.decode).toHaveBeenCalledWith('token-bearer');
    expect(mockNext).toHaveBeenCalled();
  });
});

// ─── verificarAdmin ───────────────────────────────────────────────────────────
describe('verificarAdmin', () => {
  it('permite acceso solo al rol administrador', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Admin', rol: 'administrador' });
    const req = mockReq({ headers: { token: 'valid' } });
    const res = mockRes();
    await auth.verificarAdmin(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('deniega acceso a roles no administrador', async () => {
    tokenServices.decode.mockResolvedValue({ id: 2, nombre: 'Leo', rol: 'soporte' });
    const res = mockRes();
    await auth.verificarAdmin(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// ─── verificarAdminCalCot ─────────────────────────────────────────────────────
describe('verificarAdminCalCot', () => {
  const rolesPermitidos = ['administrador', 'cotizaciones', 'calidad'];

  rolesPermitidos.forEach(rol => {
    it(`permite acceso al rol ${rol}`, async () => {
      tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol });
      const req = mockReq({ headers: { token: 'valid' } });
      const res = mockRes();
      await auth.verificarAdminCalCot(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  it('deniega acceso a rol soporte', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol: 'soporte' });
    const res = mockRes();
    await auth.verificarAdminCalCot(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── verificarUbicaciones ─────────────────────────────────────────────────────
describe('verificarUbicaciones', () => {
  const rolesPermitidos = ['administrador', 'bodega', 'soporte', 'aplicaciones'];

  rolesPermitidos.forEach(rol => {
    it(`permite acceso al rol ${rol}`, async () => {
      tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol });
      const req = mockReq({ headers: { token: 'valid' } });
      const res = mockRes();
      await auth.verificarUbicaciones(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  it('deniega acceso a rol lumira', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol: 'lumira' });
    const res = mockRes();
    await auth.verificarUbicaciones(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('deniega acceso a rol comercial', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol: 'comercial' });
    const res = mockRes();
    await auth.verificarUbicaciones(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── verificarConfirmadores ───────────────────────────────────────────────────
describe('verificarConfirmadores', () => {
  const rolesPermitidos = ['administrador', 'bodega', 'soporte', 'aplicaciones', 'lumira', 'ingresos'];

  rolesPermitidos.forEach(rol => {
    it(`permite acceso al rol ${rol}`, async () => {
      tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol });
      const req = mockReq({ headers: { token: 'valid' } });
      const res = mockRes();
      await auth.verificarConfirmadores(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  it('deniega acceso a rol comercial', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol: 'comercial' });
    const res = mockRes();
    await auth.verificarConfirmadores(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('deniega acceso a rol calidad', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol: 'calidad' });
    const res = mockRes();
    await auth.verificarConfirmadores(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deniega acceso a rol cotizaciones', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'User', rol: 'cotizaciones' });
    const res = mockRes();
    await auth.verificarConfirmadores(mockReq({ headers: { token: 'valid' } }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
