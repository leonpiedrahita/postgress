const ingresoController = require('../controllers/ingresoController');

const mockPrisma = {
  ingreso: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  etapa: {
    create: jest.fn(),
    update: jest.fn(),
  },
  equipo: {
    findUnique: jest.fn(),
  },
  $queryRaw: jest.fn(),
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

// ─── listarTodosLosIngresos ───────────────────────────────────────────────────
describe('listarTodosLosIngresos', () => {
  it('retorna 200 con la lista de ingresos', async () => {
    const ingresos = [{ id: 1, estado: 'Abierto' }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarTodosLosIngresos(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna [] si no hay ingresos', async () => {
    mockPrisma.ingreso.findMany.mockResolvedValue([]);
    const res = mockRes();
    await ingresoController.listarTodosLosIngresos(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.listarTodosLosIngresos(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarIngresosAbiertos ───────────────────────────────────────────────────
describe('listarIngresosAbiertos', () => {
  it('retorna 200 con ingresos abiertos ordenados', async () => {
    const rawIds = [{ id: BigInt(2) }, { id: BigInt(1) }];
    const ingresosRaw = [{ id: 1 }, { id: 2 }];
    mockPrisma.$queryRaw.mockResolvedValue(rawIds);
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresosRaw);

    const res = mockRes();
    await ingresoController.listarIngresosAbiertos(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const result = res.json.mock.calls[0][0];
    expect(result.map(i => i.id)).toEqual([2, 1]);
  });

  it('retorna 500 si $queryRaw lanza error', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.listarIngresosAbiertos(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarIngresosPorEstado ──────────────────────────────────────────────────
describe('listarIngresosPorEstado', () => {
  it('retorna 200 con ingresos filtrados por estado', async () => {
    const ingresos = [{ id: 1, estado: 'Cerrado' }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarIngresosPorEstado(mockReq({ params: { estado: 'Cerrado' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.listarIngresosPorEstado(mockReq({ params: { estado: 'Abierto' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarIngresosPorSerieDeEquipo ──────────────────────────────────────────
describe('listarIngresosPorSerieDeEquipo', () => {
  it('retorna 200 con ingresos por serie', async () => {
    const ingresos = [{ id: 1 }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarIngresosPorSerieDeEquipo(mockReq({ params: { serie: 'ABC-001' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.listarIngresosPorSerieDeEquipo(mockReq({ params: { serie: 'X' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarIngresosPorNombreDeCliente ─────────────────────────────────────────
describe('listarIngresosPorNombreDeCliente', () => {
  it('retorna 200 con ingresos por nombre de cliente', async () => {
    const ingresos = [{ id: 3 }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarIngresosPorNombreDeCliente(
      mockReq({ params: { nombreCliente: 'Clínica' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.listarIngresosPorNombreDeCliente(
      mockReq({ params: { nombreCliente: 'X' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── obtenerIngresoPorId ──────────────────────────────────────────────────────
describe('obtenerIngresoPorId', () => {
  it('retorna 200 con el ingreso', async () => {
    const ingreso = { id: 1, estado: 'Abierto' };
    mockPrisma.ingreso.findUnique.mockResolvedValue(ingreso);

    const res = mockRes();
    await ingresoController.obtenerIngresoPorId(mockReq({ params: { ingresoId: '1' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingreso);
  });

  it('retorna 400 si ingresoId no es un número', async () => {
    const res = mockRes();
    await ingresoController.obtenerIngresoPorId(mockReq({ params: { ingresoId: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el ingreso no existe', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await ingresoController.obtenerIngresoPorId(mockReq({ params: { ingresoId: '999' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.obtenerIngresoPorId(mockReq({ params: { ingresoId: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrarIngreso ─────────────────────────────────────────────────────────
describe('registrarIngreso', () => {
  const body = {
    equipo: { id: 1 },
    etapa: {
      etapaSeleccionada: 'Recepción',
      ubicacionEtapaSeleccionada: 'Bodega',
      comentario: 'Ingresa para revisión',
      nombre: 'Diagnóstico',
      responsable: 'Juan',
      fecha: '2024-01-01',
      ubicacion: 'Taller',
    },
  };

  it('crea el ingreso con etapas y retorna 201', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.ingreso.create.mockResolvedValue({ id: 10, etapas: [] });

    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body }), res);

    expect(mockPrisma.ingreso.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 400 si falta equipo.id', async () => {
    const res = mockRes();
    await ingresoController.registrarIngreso(
      mockReq({ body: { equipo: {}, etapa: body.etapa } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si falta etapa', async () => {
    const res = mockRes();
    await ingresoController.registrarIngreso(
      mockReq({ body: { equipo: { id: 1 } } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si el equipo ya tiene un ingreso abierto', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue({ id: 5, estado: 'Abierto' });
    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el equipo no existe', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findFirst.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── agregarEtapa ─────────────────────────────────────────────────────────────
describe('agregarEtapa', () => {
  const body = {
    nombre: 'Reparación',
    comentario: 'En proceso',
    responsable: 'María',
    fecha: '2024-02-01',
    ubicacion: 'Taller',
    etapaActual: 2,
    ultimaEtapa: 2,
    estado: 'Abierto',
  };

  it('agrega etapa y actualiza ingreso, retorna 201', async () => {
    const ingreso = { id: 1, estado: 'Abierto', etapas: [{ id: 100 }] };
    mockPrisma.ingreso.findUnique.mockResolvedValue(ingreso);
    mockPrisma.etapa.update.mockResolvedValue({});
    mockPrisma.etapa.create.mockResolvedValue({ id: 101 });
    mockPrisma.ingreso.update.mockResolvedValue({ id: 1, etapaActual: 2, estado: 'Abierto' });

    const res = mockRes();
    await ingresoController.agregarEtapa(mockReq({ params: { ingresoId: '1' }, body }), res);

    expect(mockPrisma.etapa.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 400 si ingresoId no es número', async () => {
    const res = mockRes();
    await ingresoController.agregarEtapa(mockReq({ params: { ingresoId: 'abc' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si faltan campos requeridos', async () => {
    const res = mockRes();
    await ingresoController.agregarEtapa(
      mockReq({ params: { ingresoId: '1' }, body: { nombre: 'Reparación' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el ingreso no existe', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await ingresoController.agregarEtapa(mockReq({ params: { ingresoId: '999' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 400 si el ingreso no está Abierto', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({ id: 1, estado: 'Cerrado', etapas: [] });
    const res = mockRes();
    await ingresoController.agregarEtapa(mockReq({ params: { ingresoId: '1' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.agregarEtapa(mockReq({ params: { ingresoId: '1' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
