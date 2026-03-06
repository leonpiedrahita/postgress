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
  it('retorna 404 si no hay token', async () => {
    const res = mockRes();
    await auth.verificarUsuario(mockReq(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
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
