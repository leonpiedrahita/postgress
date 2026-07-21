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

  // ─── Paginación opcional ────────────────────────────────────────────────────
  it('con ?page&limit responde { data, total, page, limit } y usa skip/take', async () => {
    const pagina = [{ id: 10 }, { id: 9 }];
    mockReporte.findMany.mockResolvedValue(pagina);
    mockReporte.count.mockResolvedValue(42);

    const res = mockRes();
    await reporteController.listar(mockReq({ query: { page: '2', limit: '2' } }), res);

    expect(mockReporte.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 2, orderBy: { id: 'desc' } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: pagina, total: 42, page: 2, limit: 2 });
  });

  it('sin query params mantiene la respuesta como array plano (compatibilidad)', async () => {
    const reportes = [{ id: 1 }];
    mockReporte.findMany.mockResolvedValue(reportes);

    const res = mockRes();
    await reporteController.listar(mockReq({ query: {} }), res);

    expect(mockReporte.findMany).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith(reportes);
  });

  ['abc', '0', '-1', '201'].forEach(limit => {
    it(`retorna 400 con limit inválido "${limit}" sin tocar la BD`, async () => {
      const res = mockRes();
      await reporteController.listar(mockReq({ query: { limit } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Parámetros de paginación inválidos' });
      expect(mockReporte.findMany).not.toHaveBeenCalled();
    });
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

// ─── listaruno ────────────────────────────────────────────────────────────────
describe('listaruno', () => {
  const ID_CUID = 'cmqrf97se0000k94gnkdh96t4';

  it('retorna 200 con el reporte usando el id (CUID) directamente', async () => {
    const reporte = { id: ID_CUID, tipodeasistencia: 'Preventivo' };
    mockReporte.findUnique.mockResolvedValue(reporte);

    const res = mockRes();
    await reporteController.listaruno(mockReq({ params: { id: ID_CUID } }), res);

    expect(mockReporte.findUnique).toHaveBeenCalledWith({ where: { id: ID_CUID } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reporte);
  });

  it('retorna 404 si el reporte no existe', async () => {
    mockReporte.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await reporteController.listaruno(mockReq({ params: { id: ID_CUID } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Reporte no encontrado' });
  });

  ['abc', '0', '-1', '', 'id con espacios', 'a'.repeat(50)].forEach(id => {
    it(`retorna 400 con id inválido "${id}" sin tocar la BD`, async () => {
      const res = mockRes();
      await reporteController.listaruno(mockReq({ params: { id } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID inválido' });
      expect(mockReporte.findUnique).not.toHaveBeenCalled();
    });
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockReporte.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await reporteController.listaruno(mockReq({ params: { id: ID_CUID } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});

// ─── actualizar ───────────────────────────────────────────────────────────────
describe('actualizar', () => {
  const ID_CUID = 'cmqrf97se0000k94gnkdh96t4';

  it('actualiza el modelo REPORTE (no equipo) con id CUID', async () => {
    const actualizado = { id: ID_CUID, observaciones: 'Editado' };
    mockReporte.update.mockResolvedValue(actualizado);

    const res = mockRes();
    await reporteController.actualizar(
      mockReq({ params: { id: ID_CUID }, body: { observaciones: 'Editado' } }),
      res
    );

    expect(mockReporte.update).toHaveBeenCalledWith({
      where: { id: ID_CUID },
      data: { observaciones: 'Editado' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Reporte actualizado', reporte: actualizado });
  });

  ['abc', '0', '-1', '', 'id con espacios', 'a'.repeat(50)].forEach(id => {
    it(`retorna 400 con id inválido "${id}" sin tocar la BD`, async () => {
      const res = mockRes();
      await reporteController.actualizar(mockReq({ params: { id }, body: {} }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID inválido' });
      expect(mockReporte.update).not.toHaveBeenCalled();
    });
  });

  it('retorna 500 con mensaje genérico si Prisma lanza error', async () => {
    mockReporte.update.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await reporteController.actualizar(
      mockReq({ params: { id: ID_CUID }, body: { observaciones: 'X' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});
