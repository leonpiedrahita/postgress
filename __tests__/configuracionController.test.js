const mockSistemaCfgNotif = {
  findUnique: jest.fn(),
};

jest.mock('../src/prisma-client', () => ({
  getPrismaWithUser: jest.fn(() => ({
    configuracionNotificacion: mockSistemaCfgNotif,
  })),
}));

const configuracionController = require('../controllers/configuracionController');

const mockCfgNotif = {
  findMany: jest.fn(),
  upsert: jest.fn(),
  findUnique: jest.fn(),
};

const mockPrisma = {
  configuracionNotificacion: mockCfgNotif,
  $transaction: jest.fn(),
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

// ─── obtenerNovedades (singleton prisma — ruta pública) ───────────────────────
describe('obtenerNovedades', () => {
  it('retorna habilitado false si no hay registro', async () => {
    mockSistemaCfgNotif.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await configuracionController.obtenerNovedades({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ habilitado: false });
  });

  it('retorna el valor del registro cuando existe (true)', async () => {
    mockSistemaCfgNotif.findUnique.mockResolvedValue({ habilitado: true });
    const res = mockRes();
    await configuracionController.obtenerNovedades({}, res);
    expect(res.json).toHaveBeenCalledWith({ habilitado: true });
  });

  it('retorna el valor del registro cuando existe (false)', async () => {
    mockSistemaCfgNotif.findUnique.mockResolvedValue({ habilitado: false });
    const res = mockRes();
    await configuracionController.obtenerNovedades({}, res);
    expect(res.json).toHaveBeenCalledWith({ habilitado: false });
  });

  it('retorna 500 si findUnique falla', async () => {
    mockSistemaCfgNotif.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await configuracionController.obtenerNovedades({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── obtenerEtiquetasAlternativas (singleton prisma — ruta pública) ───────────
describe('obtenerEtiquetasAlternativas', () => {
  it('retorna habilitado false si no hay registro', async () => {
    mockSistemaCfgNotif.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await configuracionController.obtenerEtiquetasAlternativas({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ habilitado: false });
  });

  it('retorna el valor del registro cuando existe (true)', async () => {
    mockSistemaCfgNotif.findUnique.mockResolvedValue({ habilitado: true });
    const res = mockRes();
    await configuracionController.obtenerEtiquetasAlternativas({}, res);
    expect(res.json).toHaveBeenCalledWith({ habilitado: true });
  });

  it('consulta el registro sistema/etiquetas_alternativas', async () => {
    mockSistemaCfgNotif.findUnique.mockResolvedValue({ habilitado: true });
    await configuracionController.obtenerEtiquetasAlternativas({}, mockRes());
    expect(mockSistemaCfgNotif.findUnique).toHaveBeenCalledWith({
      where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'etiquetas_alternativas' } },
      select: { habilitado: true },
    });
  });

  it('retorna 500 si findUnique falla', async () => {
    mockSistemaCfgNotif.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await configuracionController.obtenerEtiquetasAlternativas({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── obtenerConfiguracion ─────────────────────────────────────────────────────
describe('obtenerConfiguracion', () => {
  it('retorna 200 con todas las filas de configuración', async () => {
    const filas = [
      { rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true },
      { rol: 'calidad', tipoNotificacion: 'etapa_cuarentena', habilitado: false },
    ];
    mockCfgNotif.findMany.mockResolvedValue(filas);

    const res = mockRes();
    await configuracionController.obtenerConfiguracion(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(filas);
  });

  it('retorna 500 si findMany falla', async () => {
    mockCfgNotif.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await configuracionController.obtenerConfiguracion(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── guardarConfiguracionBulk ─────────────────────────────────────────────────
describe('guardarConfiguracionBulk', () => {
  it('retorna 400 si cambios no es array', async () => {
    const req = mockReq({ body: { cambios: 'no-array' } });
    const res = mockRes();
    await configuracionController.guardarConfiguracionBulk(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si cambios es array vacío', async () => {
    const req = mockReq({ body: { cambios: [] } });
    const res = mockRes();
    await configuracionController.guardarConfiguracionBulk(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('guarda correctamente y retorna 200', async () => {
    mockPrisma.$transaction.mockResolvedValue([{}]);
    const req = mockReq({
      body: { cambios: [{ rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true }] },
    });
    const res = mockRes();
    await configuracionController.guardarConfiguracionBulk(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Configuración guardada', total: 1 });
  });

  it('guarda múltiples cambios y reporta el total correcto', async () => {
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
    const cambios = [
      { rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true },
      { rol: 'calidad', tipoNotificacion: 'etapa_cuarentena', habilitado: false },
    ];
    const req = mockReq({ body: { cambios } });
    const res = mockRes();
    await configuracionController.guardarConfiguracionBulk(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Configuración guardada', total: 2 });
  });

  it('retorna 500 si $transaction falla', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));
    const req = mockReq({
      body: { cambios: [{ rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true }] },
    });
    const res = mockRes();
    await configuracionController.guardarConfiguracionBulk(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarConfiguracion ──────────────────────────────────────────────────
describe('actualizarConfiguracion', () => {
  it('actualiza correctamente y retorna 200', async () => {
    mockCfgNotif.upsert.mockResolvedValue({});
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
    expect(mockCfgNotif.upsert).not.toHaveBeenCalled();
  });

  it('retorna 400 si falta tipoNotificacion', async () => {
    const req = mockReq({ body: { rol: 'soporte', habilitado: true } });
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

  it('acepta habilitado = false y retorna 200', async () => {
    mockCfgNotif.upsert.mockResolvedValue({});
    const req = mockReq({ body: { rol: 'bodega', tipoNotificacion: 'etapa_despachado', habilitado: false } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 si upsert falla', async () => {
    mockCfgNotif.upsert.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ body: { rol: 'soporte', tipoNotificacion: 'ingreso', habilitado: true } });
    const res = mockRes();
    await configuracionController.actualizarConfiguracion(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── obtenerGlobal ────────────────────────────────────────────────────────────
describe('obtenerGlobal', () => {
  it('retorna habilitado true si no hay registro', async () => {
    mockCfgNotif.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await configuracionController.obtenerGlobal(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ habilitado: true });
  });

  it('retorna el valor del registro si existe', async () => {
    mockCfgNotif.findUnique.mockResolvedValue({ habilitado: false });
    const res = mockRes();
    await configuracionController.obtenerGlobal(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith({ habilitado: false });
  });

  it('retorna 500 si findUnique falla', async () => {
    mockCfgNotif.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await configuracionController.obtenerGlobal(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarGlobal ─────────────────────────────────────────────────────────
describe('actualizarGlobal', () => {
  it('actualiza correctamente y retorna 200', async () => {
    mockCfgNotif.upsert.mockResolvedValue({});
    const req = mockReq({ body: { habilitado: false } });
    const res = mockRes();
    await configuracionController.actualizarGlobal(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Toggle global actualizado', habilitado: false });
  });

  it('retorna 400 si habilitado no es booleano', async () => {
    const req = mockReq({ body: { habilitado: 'yes' } });
    const res = mockRes();
    await configuracionController.actualizarGlobal(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 500 si upsert falla', async () => {
    mockCfgNotif.upsert.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ body: { habilitado: true } });
    const res = mockRes();
    await configuracionController.actualizarGlobal(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
