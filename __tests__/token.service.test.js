process.env.JWT_KEY = 'test-secret-key';

// La factory de jest.mock se ejecuta en el momento correcto (antes del require del servicio).
// Exponemos el mock del usuario como propiedad del módulo para accederlo después.
jest.mock('@prisma/client', () => {
  const mockFindFirst = jest.fn();
  const PrismaClient = jest.fn().mockImplementation(() => ({
    usuario: { findFirst: mockFindFirst },
  }));
  PrismaClient._mockFindFirst = mockFindFirst;
  return { PrismaClient };
});

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const mockFindFirst = PrismaClient._mockFindFirst;

const tokenService = require('../services/token');

beforeEach(() => jest.clearAllMocks());

// ─── encode ───────────────────────────────────────────────────────────────────
describe('encode', () => {
  const user = { id: 1, nombre: 'Leo', rol: 'administrador', email: 'leo@test.com', estado: 1 };

  it('genera un JWT con los campos correctos', () => {
    const token = tokenService.encode(user);
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    expect(decoded.id).toBe(user.id);
    expect(decoded.nombre).toBe(user.nombre);
    expect(decoded.rol).toBe(user.rol);
    expect(decoded.email).toBe(user.email);
    expect(decoded.estado).toBe(user.estado);
  });

  it('el token expira aproximadamente en 2 horas', () => {
    const antes = Math.floor(Date.now() / 1000);
    const token = tokenService.encode(user);
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const diferencia = decoded.exp - antes;

    // Entre 895 y 905 segundos (15 minutos ± 5s)
    expect(diferencia).toBeGreaterThanOrEqual(895);
    expect(diferencia).toBeLessThanOrEqual(905);
  });
});

// ─── decode ───────────────────────────────────────────────────────────────────
describe('decode', () => {
  const user = { id: 1, nombre: 'Leo', rol: 'administrador', email: 'leo@test.com', estado: 1 };

  it('retorna el usuario para un token válido', async () => {
    const token = tokenService.encode(user);
    mockFindFirst.mockResolvedValue(user);

    const resultado = await tokenService.decode(token);
    expect(resultado).toEqual(user);
  });

  it('retorna "token vencido" para un token expirado', async () => {
    const tokenVencido = jwt.sign(
      { id: 1, nombre: 'Leo', rol: 'admin', email: 'leo@test.com', estado: 1, exp: 1 },
      process.env.JWT_KEY
    );

    const resultado = await tokenService.decode(tokenVencido);
    expect(resultado).toBe('token vencido');
  });

  it('retorna false para un token inválido', async () => {
    const resultado = await tokenService.decode('token-invalido-xyz');
    expect(resultado).toBe(false);
  });

  it('retorna false si el usuario no existe en la base de datos', async () => {
    const token = tokenService.encode(user);
    mockFindFirst.mockResolvedValue(null);

    const resultado = await tokenService.decode(token);
    expect(resultado).toBe(false);
  });
});
