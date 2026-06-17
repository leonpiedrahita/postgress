jest.mock('../src/prisma-client', () => {
  const mockReporte = {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const instance = { reporte: mockReporte };
  return {
    prisma: instance,
    getPrismaWithUser: jest.fn(() => instance),
    _instance: instance,
  };
});

const { _instance: mockPrismaInternal } = require('../src/prisma-client');
const reporteController = require('../controllers/reporteController');

const mockReporte = mockPrismaInternal.reporte;

const mockReq = (overrides = {}) => ({
  prisma: mockPrismaInternal,
  params: {},
  body: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

const mockNext = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ─── listar ───────────────────────────────────────────────────────────────────
describe('listar', () => {
  it('retorna 200 con la lista de reportes', async () => {
    const reportes = [{ id: 1, tipodeasistencia: 'Preventivo' }];
    mockReporte.findMany.mockResolvedValue(reportes);

    const res = mockRes();
    await reporteController.listar(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reportes);
  });

  it('retorna 200 con array vacío si no hay reportes', async () => {
    mockReporte.findMany.mockResolvedValue([]);
    const res = mockRes();
    await reporteController.listar(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockReporte.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await reporteController.listar(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrar ────────────────────────────────────────────────────────────────
describe('registrar', () => {
  const reporteBase = {
    tipodeasistencia: 'Preventivo',
    duracion: '2',
    fechadeinicio: '2024-01-01',
    fechadefinalizacion: '2024-01-01',
    infoequipo: 'Ventilador X',
    propietario: 'Hospital X',
    nombrecliente: 'Hospital X',
    nitcliente: '900123456',
    sedecliente: 'Principal',
    direccioncliente: 'Cra 1 # 2-3',
    profesionalcliente: 'Dr. García',
    telefonocliente: '3001234567',
    hallazgos: 'Ninguno',
    actividades: 'Limpieza general',
    pruebas: 'Prueba eléctrica',
    repuestos: 'Sin repuestos',
    observaciones: 'N/A',
    firmacliente: '',
    firmaingeniero: '',
    ingeniero: 'Leo',
  };

  it('llama next() cuando todos los campos son válidos', async () => {
    mockReporte.count.mockResolvedValue(5);
    mockReporte.create.mockResolvedValue({ id: 10 });

    const req = mockReq({ body: { reporte: reporteBase } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('asigna numero = contador + 1', async () => {
    mockReporte.count.mockResolvedValue(7);
    mockReporte.create.mockResolvedValue({ id: 11 });

    const req = mockReq({ body: { reporte: reporteBase } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ numero: 8 }) })
    );
  });

  it('guarda el id del nuevo reporte en req.idcreada', async () => {
    mockReporte.count.mockResolvedValue(1);
    mockReporte.create.mockResolvedValue({ id: 42 });

    const req = mockReq({ body: { reporte: reporteBase } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(req.idcreada).toBe(42);
  });

  it('reporteexterno siempre es 0 en el registro interno', async () => {
    mockReporte.count.mockResolvedValue(1);
    mockReporte.create.mockResolvedValue({ id: 1 });

    const req = mockReq({ body: { reporte: reporteBase } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reporteexterno: 0 }) })
    );
  });

  // ─── Hallazgo 10: duracion null/undefined no debe hacer crash ─────────────
  it('duracion null → almacena cadena vacía sin crash', async () => {
    mockReporte.count.mockResolvedValue(3);
    mockReporte.create.mockResolvedValue({ id: 12 });

    const req = mockReq({ body: { reporte: { ...reporteBase, duracion: null } } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duracion: '' }) })
    );
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('duracion undefined → almacena cadena vacía sin crash', async () => {
    const { duracion, ...sinDuracion } = reporteBase;
    mockReporte.count.mockResolvedValue(3);
    mockReporte.create.mockResolvedValue({ id: 13 });

    const req = mockReq({ body: { reporte: sinDuracion } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duracion: '' }) })
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('duracion numérica → se convierte a string', async () => {
    mockReporte.count.mockResolvedValue(1);
    mockReporte.create.mockResolvedValue({ id: 14 });

    const req = mockReq({ body: { reporte: { ...reporteBase, duracion: 45 } } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duracion: '45' }) })
    );
  });

  it('retorna 500 y no llama next() si Prisma lanza error', async () => {
    mockReporte.count.mockResolvedValue(1);
    mockReporte.create.mockRejectedValue(new Error('DB error'));

    const req = mockReq({ body: { reporte: reporteBase } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('retorna 500 si el count de Prisma falla', async () => {
    mockReporte.count.mockRejectedValue(new Error('DB error'));

    const req = mockReq({ body: { reporte: reporteBase } });
    const res = mockRes();
    await reporteController.registrar(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrarexterno ─────────────────────────────────────────────────────────
describe('registrarexterno', () => {
  const reporteExternoPayload = {
    tipodeasistencia: 'Correctivo',
    fechadeinicio: '2024-03-01',
    fechadefinalizacion: '2024-03-01',
    infoequipo: 'Monitor',
    propietario: 'Clínica Sur',
    nombrecliente: 'Clínica Sur',
    nitcliente: '800456789',
    sedecliente: 'Norte',
    direccioncliente: 'Av 5',
    ingeniero: 'Ana',
  };

  it('llama next() cuando el JSON de reporte es válido', async () => {
    mockReporte.create.mockResolvedValue({ id: 20 });

    const res = mockRes();
    res.locals = { llave: 'S3-KEY-ABC' };

    const req = mockReq({ body: { reporte: JSON.stringify(reporteExternoPayload) } });
    await reporteController.registrarexterno(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('almacena reporteexterno = 1 y la llave de S3', async () => {
    mockReporte.create.mockResolvedValue({ id: 21 });

    const res = mockRes();
    res.locals = { llave: 'S3-KEY-XYZ' };

    const req = mockReq({ body: { reporte: JSON.stringify(reporteExternoPayload) } });
    await reporteController.registrarexterno(req, res, mockNext);

    expect(mockReporte.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reporteexterno: 1, llavereporte: 'S3-KEY-XYZ' }),
      })
    );
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockReporte.create.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    res.locals = { llave: 'KEY' };

    const req = mockReq({ body: { reporte: JSON.stringify(reporteExternoPayload) } });
    await reporteController.registrarexterno(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('retorna 500 si el body.reporte no es JSON válido', async () => {
    const res = mockRes();
    res.locals = { llave: 'KEY' };

    const req = mockReq({ body: { reporte: 'esto no es JSON' } });
    await reporteController.registrarexterno(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
