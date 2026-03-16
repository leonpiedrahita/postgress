jest.mock('bcryptjs');
jest.mock('../services/token');
jest.mock('../src/prisma-client', () => {
  const mockUsuario = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  };
  const instance = { usuario: mockUsuario };
  return {
    getPrismaWithUser: jest.fn(() => instance),
    _instance: instance,
  };
});
jest.mock('@prisma/client', () => {
  const mockUsuario = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  };
  const instance = { usuario: mockUsuario };
  const PrismaClient = jest.fn(() => instance);
  PrismaClient._instance = instance;
  return { PrismaClient };
});

const bcrypt = require('bcryptjs');
const tokenServices = require('../services/token');
const { PrismaClient } = require('@prisma/client');
const { _instance: mockPrismaInternal } = require('../src/prisma-client');

// prismaBase (usado en ingresar) usa PrismaClient directamente
const mockPrismaBase = PrismaClient._instance;

const usuarioController = require('../controllers/usuarioController');

const mockReq = (overrides = {}) => ({
  prisma: mockPrismaInternal,
  headers: { token: 'mock-token' },
  params: {},
  body: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ─── ingresar ─────────────────────────────────────────────────────────────────
describe('ingresar', () => {
  it('retorna 200 con token si credenciales son correctas y resetea el contador', async () => {
    const usuario = { id: 1, email: 'test@test.com', password: 'hash', estado: 1, rol: 'administrador', nombre: 'Leo' };
    mockPrismaBase.usuario.findUnique.mockResolvedValue(usuario);
    mockPrismaBase.usuario.update.mockResolvedValue(usuario);
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashed-refresh');
    tokenServices.encode.mockReturnValue('jwt-token');
    tokenServices.generateRefreshToken = jest.fn().mockReturnValue('raw-refresh-token');

    const req = mockReq({ body: { email: 'test@test.com', password: '123456' } });
    const res = mockRes();
    await usuarioController.ingresar(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ auth: true, tokenReturn: 'jwt-token', refreshToken: 'raw-refresh-token' })
    );
    expect(mockPrismaBase.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ refreshTokenCount: 0 }) })
    );
  });

  it('retorna 401 si el usuario no existe', async () => {
    mockPrismaBase.usuario.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await usuarioController.ingresar(
      mockReq({ body: { email: 'no@existe.com', password: '123' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retorna 403 si el usuario está inactivo', async () => {
    mockPrismaBase.usuario.findUnique.mockResolvedValue({ id: 1, estado: 0, password: 'hash' });
    const res = mockRes();
    await usuarioController.ingresar(
      mockReq({ body: { email: 'inactivo@test.com', password: '123' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 401 si la contraseña es incorrecta', async () => {
    mockPrismaBase.usuario.findUnique.mockResolvedValue({ id: 1, estado: 1, password: 'hash' });
    bcrypt.compare.mockResolvedValue(false);
    const res = mockRes();
    await usuarioController.ingresar(
      mockReq({ body: { email: 'test@test.com', password: 'wrong' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─── registrar ────────────────────────────────────────────────────────────────
describe('registrar', () => {
  it('crea un usuario y retorna 201', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed-password');
    mockPrismaInternal.usuario.create.mockResolvedValue({ id: 1, nombre: 'Leo', email: 'leo@test.com' });

    const req = mockReq({ body: { nombre: 'Leo', email: 'leo@test.com', password: '123456', rol: 'administrador' } });
    const res = mockRes();
    await usuarioController.registrar(req, res, mockNext);

    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 409 si el email ya existe', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue({ id: 1, email: 'leo@test.com' });
    const res = mockRes();
    await usuarioController.registrar(
      mockReq({ body: { email: 'leo@test.com', password: '123' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockPrismaInternal.usuario.create).not.toHaveBeenCalled();
  });
});

// ─── actualizarContrasena ─────────────────────────────────────────────────────
describe('actualizarContrasena', () => {
  it('actualiza la contraseña y retorna 200', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue({ id: 1, email: 'leo@test.com' });
    bcrypt.hash.mockResolvedValue('new-hash');
    mockPrismaInternal.usuario.update.mockResolvedValue({ id: 1, nombre: 'Leo', email: 'leo@test.com', rol: 'administrador' });

    const req = mockReq({ params: { id: '1' }, body: { newPassword: 'nueva123' } });
    const res = mockRes();
    await usuarioController.actualizarContrasena(req, res, mockNext);

    expect(bcrypt.hash).toHaveBeenCalledWith('nueva123', 10);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 400 si la contraseña tiene menos de 6 caracteres', async () => {
    const res = mockRes();
    await usuarioController.actualizarContrasena(
      mockReq({ params: { id: '1' }, body: { newPassword: '123' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si no se envía nueva contraseña', async () => {
    const res = mockRes();
    await usuarioController.actualizarContrasena(
      mockReq({ params: { id: '1' }, body: {} }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el usuario no existe', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await usuarioController.actualizarContrasena(
      mockReq({ params: { id: '999' }, body: { newPassword: 'nueva123' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue({ id: 1 });
    bcrypt.hash.mockResolvedValue('new-hash');
    mockPrismaInternal.usuario.update.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await usuarioController.actualizarContrasena(
      mockReq({ params: { id: '1' }, body: { newPassword: 'nueva123' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── ingresar (camino error) ──────────────────────────────────────────────────
describe('ingresar — error 500', () => {
  it('retorna 500 si Prisma lanza error', async () => {
    mockPrismaBase.usuario.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await usuarioController.ingresar(
      mockReq({ body: { email: 'test@test.com', password: '123456' } }), res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrar (camino error) ─────────────────────────────────────────────────
describe('registrar — error 500', () => {
  it('retorna 500 si Prisma lanza error al crear', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed-password');
    mockPrismaInternal.usuario.create.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await usuarioController.registrar(
      mockReq({ body: { nombre: 'Leo', email: 'leo@test.com', password: '123456', rol: 'administrador' } }),
      res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listar ───────────────────────────────────────────────────────────────────
describe('listar', () => {
  it('retorna 200 con la lista de usuarios', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Admin', rol: 'administrador' });
    const usuarios = [{ id: 1, nombre: 'Leo', email: 'leo@test.com', rol: 'administrador', estado: 1 }];
    mockPrismaInternal.usuario.findMany.mockResolvedValue(usuarios);

    const res = mockRes();
    await usuarioController.listar(mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(usuarios);
  });

  it('llama next(err) si Prisma lanza error', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Admin', rol: 'administrador' });
    mockPrismaInternal.usuario.findMany.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await usuarioController.listar(mockReq(), res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────
describe('refresh', () => {
  it('retorna 401 si no se envía refreshToken', async () => {
    const res = mockRes();
    await usuarioController.refresh(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retorna 200 con nuevo accessToken, renueva ventana e incrementa contador', async () => {
    const usuario = {
      id: 1, nombre: 'Leo', rol: 'administrador', estado: 1,
      refreshToken: 'hash', refreshTokenExp: new Date(Date.now() + 3600000),
      refreshTokenCount: 1,
    };
    mockPrismaBase.usuario.findMany.mockResolvedValue([usuario]);
    mockPrismaBase.usuario.update.mockResolvedValue({});
    bcrypt.compare.mockResolvedValue(true);
    tokenServices.encode.mockReturnValue('nuevo-access-token');

    const res = mockRes();
    await usuarioController.refresh(mockReq({ body: { refreshToken: 'raw-token' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'nuevo-access-token' });
    expect(mockPrismaBase.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ refreshTokenCount: { increment: 1 } }),
      })
    );
  });

  it('retorna 401 si el contador llegó a 3 (no aparece en findMany)', async () => {
    // El filtro refreshTokenCount: { lt: 3 } excluye al usuario, findMany retorna []
    mockPrismaBase.usuario.findMany.mockResolvedValue([]);

    const res = mockRes();
    await usuarioController.refresh(mockReq({ body: { refreshToken: 'raw-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retorna 401 si el token no coincide con ningún usuario', async () => {
    mockPrismaBase.usuario.findMany.mockResolvedValue([{ id: 1, refreshToken: 'hash', refreshTokenCount: 0 }]);
    bcrypt.compare.mockResolvedValue(false);

    const res = mockRes();
    await usuarioController.refresh(mockReq({ body: { refreshToken: 'token-invalido' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrismaBase.usuario.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await usuarioController.refresh(mockReq({ body: { refreshToken: 'token' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── salir ────────────────────────────────────────────────────────────────────
describe('salir', () => {
  it('retorna 200 aunque no se envíe refreshToken', async () => {
    const res = mockRes();
    await usuarioController.salir(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrismaBase.usuario.findMany).not.toHaveBeenCalled();
  });

  it('invalida la sesión y retorna 200 si el token coincide', async () => {
    const usuario = { id: 5, refreshToken: 'hash' };
    mockPrismaBase.usuario.findMany.mockResolvedValue([usuario]);
    bcrypt.compare.mockResolvedValue(true);
    mockPrismaBase.usuario.update.mockResolvedValue({ id: 5 });

    const res = mockRes();
    await usuarioController.salir(mockReq({ body: { refreshToken: 'raw-token' } }), res);

    expect(mockPrismaBase.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: { refreshToken: null, refreshTokenExp: null } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrismaBase.usuario.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await usuarioController.salir(mockReq({ body: { refreshToken: 'token' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizar ───────────────────────────────────────────────────────────────
describe('actualizar', () => {
  it('actualiza el usuario y retorna 200', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Admin', rol: 'administrador' });
    const usuarioActualizado = { id: 1, nombre: 'Leo', email: 'leo@test.com', rol: 'administrador' };
    mockPrismaInternal.usuario.update.mockResolvedValue(usuarioActualizado);

    const res = mockRes();
    await usuarioController.actualizar(
      mockReq({ params: { id: '1' }, body: { nombre: 'Leo', email: 'leo@test.com', rol: 'administrador', estado: 1 } }),
      res, mockNext
    );
    expect(res.json).toHaveBeenCalledWith(usuarioActualizado);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Admin', rol: 'administrador' });
    mockPrismaInternal.usuario.update.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await usuarioController.actualizar(
      mockReq({ params: { id: '1' }, body: { nombre: 'Leo', email: 'leo@test.com', rol: 'administrador', estado: 1 } }),
      res, mockNext
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarfirma ──────────────────────────────────────────────────────────
describe('actualizarfirma', () => {
  it('actualiza la firma y retorna 200', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Admin', rol: 'administrador' });
    mockPrismaInternal.usuario.update.mockResolvedValue({ id: 1, firma: 'data:image/png;base64,ABC' });

    const res = mockRes();
    await usuarioController.actualizarfirma(
      mockReq({ body: { email: 'leo@test.com', firma: 'data:image/png;base64,ABC' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    tokenServices.decode.mockResolvedValue({ id: 1, nombre: 'Admin', rol: 'administrador' });
    mockPrismaInternal.usuario.update.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await usuarioController.actualizarfirma(
      mockReq({ body: { email: 'leo@test.com', firma: 'data:image/png;base64,ABC' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── buscarfirma ──────────────────────────────────────────────────────────────
describe('buscarfirma', () => {
  beforeEach(() => {
    tokenServices.decode.mockResolvedValue({ id: 5, nombre: 'Ana', rol: 'administrador' });
  });

  it('retorna 200 con la firma si existe', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue({ firma: 'data:image/png;base64,ABC' });

    const res = mockRes();
    await usuarioController.buscarfirma(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ firma: 'data:image/png;base64,ABC' });
  });

  it('retorna 404 si el usuario no tiene firma', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue({ firma: null });

    const res = mockRes();
    await usuarioController.buscarfirma(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 400 si el token no contiene ID válido', async () => {
    tokenServices.decode.mockResolvedValue({ nombre: 'Ana' }); // sin id

    const res = mockRes();
    await usuarioController.buscarfirma(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrismaInternal.usuario.findUnique.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await usuarioController.buscarfirma(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── cambiarContrasena ────────────────────────────────────────────────────────
describe('cambiarContrasena', () => {
  const passwordValida = 'Nueva@123';

  it('cambia la contraseña y retorna 200', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue({ id: 3 });
    bcrypt.hash.mockResolvedValue('new-hash');
    mockPrismaInternal.usuario.update.mockResolvedValue({ id: 3 });

    const res = mockRes();
    await usuarioController.cambiarContrasena(
      mockReq({ body: { newPassword: passwordValida }, usuario: { id: 3 } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 400 si la contraseña no cumple complejidad', async () => {
    const res = mockRes();
    await usuarioController.cambiarContrasena(
      mockReq({ body: { newPassword: 'simple' }, usuario: { id: 3 } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si no se envía contraseña', async () => {
    const res = mockRes();
    await usuarioController.cambiarContrasena(
      mockReq({ body: {}, usuario: { id: 3 } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el usuario no existe', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await usuarioController.cambiarContrasena(
      mockReq({ body: { newPassword: passwordValida }, usuario: { id: 999 } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrismaInternal.usuario.findUnique.mockResolvedValue({ id: 3 });
    bcrypt.hash.mockResolvedValue('new-hash');
    mockPrismaInternal.usuario.update.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await usuarioController.cambiarContrasena(
      mockReq({ body: { newPassword: passwordValida }, usuario: { id: 3 } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
