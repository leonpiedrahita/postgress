jest.mock('../services/token');
jest.mock('../src/prisma-client', () => {
  const instance = { usuario: { findMany: jest.fn() } };
  return {
    getPrismaWithUser: jest.fn(() => instance),
    _instance: instance,
  };
});

const tokenService = require('../services/token');
const { getPrismaWithUser } = require('../src/prisma-client');
const attachPrisma = require('../src/middleware/attachPrisma');

const mockNext = jest.fn();

const mockReq = (overrides = {}) => ({
  headers: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('attachPrisma', () => {
  it('inyecta req.prisma y llama next() cuando el token es válido', async () => {
    tokenService.decode.mockResolvedValue({ nombre: 'Leo', id: 1 });

    const req = mockReq({ headers: { token: 'valid-token' } });
    const res = mockRes();
    await attachPrisma(req, res, mockNext);

    expect(tokenService.decode).toHaveBeenCalledWith('valid-token');
    expect(getPrismaWithUser).toHaveBeenCalledWith('Leo');
    expect(req.prisma).not.toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it('asigna req.prisma = null y llama next() si no se envía token', async () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    await attachPrisma(req, res, mockNext);

    expect(req.prisma).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it('asigna req.prisma = null y llama next() si el token es inválido', async () => {
    tokenService.decode.mockResolvedValue(false);

    const req = mockReq({ headers: { token: 'bad-token' } });
    const res = mockRes();
    await attachPrisma(req, res, mockNext);

    expect(req.prisma).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it('asigna req.prisma = null si decode retorna objeto sin nombre', async () => {
    tokenService.decode.mockResolvedValue({ id: 1 }); // sin nombre

    const req = mockReq({ headers: { token: 'token-sin-nombre' } });
    const res = mockRes();
    await attachPrisma(req, res, mockNext);

    expect(req.prisma).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });

  it('asigna req.prisma = null si decode lanza una excepción', async () => {
    tokenService.decode.mockRejectedValue(new Error('JWT error'));

    const req = mockReq({ headers: { token: 'error-token' } });
    const res = mockRes();
    await attachPrisma(req, res, mockNext);

    expect(req.prisma).toBeNull();
    expect(mockNext).toHaveBeenCalled();
  });
});
