jest.mock('../src/prisma-client', () => ({
  getPrismaWithUser: jest.fn(() => ({})),
}));

const configuracionController = require('../controllers/configuracionController');

const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

const mockReq = (overrides = {}) => ({
  prisma: mockPrisma,
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

beforeEach(() => jest.clearAllMocks());

// ─── obtenerConfiguracion ─────────────────────────────────────────────────────
describe('obtenerConfiguracion', () => {
  it('retorna 200 con todas las filas de configuración', async () => {
    const filas = [
      { rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true },
      { rol: 'calidad', tipoNotificacion: 'etapa', habilitado: false },
    ];
    mockPrisma.$queryRaw.mockResolvedValue(filas);

    const res = mockRes();
    await configuracionController.obtenerConfiguracion(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(filas);
  });

  it('retorna 500 si $queryRaw falla', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await configuracionController.obtenerConfiguracion(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarConfiguracion ──────────────────────────────────────────────────
describe('actualizarConfiguracion', () => {
  const rolesValidos = ['soporte', 'aplicaciones', 'comercial', 'cotizaciones', 'calidad', 'bodega', 'lumira', 'ventas', 'ingresos'];
  const tiposValidos = ['ingreso', 'etapa', 'etapa_despachado'];

  it('actualiza correctamente y retorna 200', async () => {
    mockPrisma.$executeRaw.mockResolvedValue(1);
    const req = mockReq({ body: { rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 400 si falta el campo rol', async () => {
    const req = mockReq({ body: { tipoNotificacion: 'ingreso', habilitado: true } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('retorna 400 si tipoNotificacion no es válido', async () => {
    const req = mockReq({ body: { rol: 'soporte', tipoNotificacion: 'invalido', habilitado: true } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si habilitado no es booleano', async () => {
    const req = mockReq({ body: { rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: 'si' } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si rol no está en la lista permitida', async () => {
    const req = mockReq({ body: { rol: 'administrador', tipoNotificacion: 'ingreso', habilitado: true } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('acepta habilitado = false', async () => {
    mockPrisma.$executeRaw.mockResolvedValue(1);
    const req = mockReq({ body: { rol: 'bodega', tipoNotificacion: 'etapa_despachado', habilitado: false } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 si $executeRaw falla', async () => {
    mockPrisma.$executeRaw.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ body: { rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
