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
  it('retorna 200 con token si credenciales son correctas', async () => {
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
});
