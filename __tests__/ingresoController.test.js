jest.mock('../services/whatsappService', () => ({
  notificarIngresoEquipo: jest.fn().mockResolvedValue(null),
  notificarCambioEtapa: jest.fn().mockResolvedValue(null),
}));

const ingresoController = require('../controllers/ingresoController');

const mockPrisma = {
  ingreso: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  equipo: {
    findUnique: jest.fn(),
  },
  etapa: {
    update: jest.fn(),
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockReq = (overrides = {}) => ({
  prisma: mockPrisma,
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

beforeEach(() => jest.clearAllMocks());

// ─── listarTodosLosIngresos ───────────────────────────────────────────────────
describe('listarTodosLosIngresos', () => {
  it('retorna 200 con la lista de ingresos', async () => {
    const ingresos = [{ id: 1, estado: 'Abierto', equipo: {}, etapas: [] }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarTodosLosIngresos(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna 200 con array vacío si no hay ingresos', async () => {
    mockPrisma.ingreso.findMany.mockResolvedValue([]);

    const res = mockRes();
    await ingresoController.listarTodosLosIngresos(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
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
  it('retorna 200 con ingresos ordenados por etapa más reciente', async () => {
    const rawIds = [{ id: BigInt(2) }, { id: BigInt(1) }];
    const ingresosRaw = [
      { id: 1, estado: 'Abierto', equipo: {}, etapas: [] },
      { id: 2, estado: 'Abierto', equipo: {}, etapas: [] },
    ];
    mockPrisma.$queryRaw.mockResolvedValue(rawIds);
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresosRaw);

    const res = mockRes();
    await ingresoController.listarIngresosAbiertos(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    // Debe respetar el orden del queryRaw: id 2 primero, luego id 1
    const resultado = res.json.mock.calls[0][0];
    expect(resultado.map(i => i.id)).toEqual([2, 1]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await ingresoController.listarIngresosAbiertos(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── obtenerIngresoPorId ──────────────────────────────────────────────────────
describe('obtenerIngresoPorId', () => {
  it('retorna 200 con el ingreso encontrado', async () => {
    const ingreso = { id: 1, estado: 'Abierto', equipo: {}, etapas: [] };
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
    expect(mockPrisma.ingreso.findUnique).not.toHaveBeenCalled();
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
  const etapaValida = {
    etapaSeleccionada: 'Llegada de equipo',
    ubicacionEtapaSeleccionada: 'Bodega',
    comentario: 'Equipo recibido',
    nombre: 'Diagnóstico',
    responsable: 'Leo',
    fecha: '2024-01-01',
    ubicacion: 'Taller',
  };

  it('crea el ingreso y retorna 201', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.ingreso.create.mockResolvedValue({ id: 10, etapas: [] });

    const req = mockReq({ body: { equipo: { id: 1 }, etapa: etapaValida } });
    const res = mockRes();
    await ingresoController.registrarIngreso(req, res);

    expect(mockPrisma.ingreso.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 400 si falta equipo.id', async () => {
    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body: { equipo: {}, etapa: etapaValida } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.ingreso.create).not.toHaveBeenCalled();
  });

  it('retorna 400 si falta el objeto etapa', async () => {
    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body: { equipo: { id: 1 } } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si el equipo ya tiene un ingreso abierto', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue({ id: 5, estado: 'Abierto' });

    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body: { equipo: { id: 1 }, etapa: etapaValida } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.ingreso.create).not.toHaveBeenCalled();
  });

  it('retorna 404 si el equipo no existe', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    const res = mockRes();
    await ingresoController.registrarIngreso(mockReq({ body: { equipo: { id: 999 }, etapa: etapaValida } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.ingreso.create).not.toHaveBeenCalled();
  });

  it('retorna 400 si faltan campos de etapa', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });

    const etapaIncompleta = { etapaSeleccionada: 'Llegada de equipo' };
    const res = mockRes();
    await ingresoController.registrarIngreso(
      mockReq({ body: { equipo: { id: 1 }, etapa: etapaIncompleta } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── agregarEtapa ─────────────────────────────────────────────────────────────
describe('agregarEtapa', () => {
  const bodyValido = {
    nombre: 'Cotización aprobada',
    comentario: 'Todo en orden',
    responsable: 'Ana',
    fecha: '2024-02-01',
    ubicacion: 'Oficina',
    etapaActual: 3,
    ultimaEtapa: 3,
    estado: 'Abierto',
  };

  const ingresoAbierto = {
    id: 1,
    estado: 'Abierto',
    etapas: [{ id: 10, nombre: 'Diagnóstico' }],
  };

  it('agrega etapa y retorna 201', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue(ingresoAbierto);
    mockPrisma.etapa.update.mockResolvedValue({});
    mockPrisma.etapa.create.mockResolvedValue({ id: 11, nombre: bodyValido.nombre });
    mockPrisma.ingreso.update.mockResolvedValue({ id: 1 });

    const req = mockReq({ params: { ingresoId: '1' }, body: bodyValido });
    const res = mockRes();
    await ingresoController.agregarEtapa(req, res);

    expect(mockPrisma.etapa.update).toHaveBeenCalled();
    expect(mockPrisma.etapa.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 400 si ingresoId no es un número', async () => {
    const res = mockRes();
    await ingresoController.agregarEtapa(
      mockReq({ params: { ingresoId: 'abc' }, body: bodyValido }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.ingreso.findUnique).not.toHaveBeenCalled();
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    const res = mockRes();
    await ingresoController.agregarEtapa(
      mockReq({ params: { ingresoId: '1' }, body: { nombre: 'X' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el ingreso no existe', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue(null);

    const res = mockRes();
    await ingresoController.agregarEtapa(
      mockReq({ params: { ingresoId: '999' }, body: bodyValido }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 400 si el ingreso no está en estado Abierto', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({ ...ingresoAbierto, estado: 'Cerrado' });

    const res = mockRes();
    await ingresoController.agregarEtapa(
      mockReq({ params: { ingresoId: '1' }, body: bodyValido }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.etapa.create).not.toHaveBeenCalled();
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findUnique.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await ingresoController.agregarEtapa(
      mockReq({ params: { ingresoId: '1' }, body: bodyValido }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarIngresosPorEstado ───────────────────────────────────────────────────
describe('listarIngresosPorEstado', () => {
  it('retorna 200 con los ingresos del estado solicitado', async () => {
    const ingresos = [{ id: 1, estado: 'Cerrado', equipo: {}, etapas: [] }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarIngresosPorEstado(
      mockReq({ params: { estado: 'Cerrado' } }),
      res
    );

    expect(mockPrisma.ingreso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: 'Cerrado' } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna 200 con array vacío si no hay ingresos', async () => {
    mockPrisma.ingreso.findMany.mockResolvedValue([]);

    const res = mockRes();
    await ingresoController.listarIngresosPorEstado(
      mockReq({ params: { estado: 'Cerrado' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await ingresoController.listarIngresosPorEstado(
      mockReq({ params: { estado: 'Abierto' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarIngresosPorSerieDeEquipo ───────────────────────────────────────────
describe('listarIngresosPorSerieDeEquipo', () => {
  it('retorna 200 con los ingresos que coinciden con la serie', async () => {
    const ingresos = [{ id: 1, estado: 'Abierto', equipo: { serie: 'ABC-001' }, etapas: [] }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarIngresosPorSerieDeEquipo(
      mockReq({ params: { serie: 'ABC-001' } }),
      res
    );

    expect(mockPrisma.ingreso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { equipo: { serie: 'ABC-001' } } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna 200 con array vacío si no hay coincidencias', async () => {
    mockPrisma.ingreso.findMany.mockResolvedValue([]);

    const res = mockRes();
    await ingresoController.listarIngresosPorSerieDeEquipo(
      mockReq({ params: { serie: 'NO-EXISTE' } }),
      res
    );
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await ingresoController.listarIngresosPorSerieDeEquipo(
      mockReq({ params: { serie: 'ABC' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarIngresosPorNombreDeCliente ─────────────────────────────────────────
describe('listarIngresosPorNombreDeCliente', () => {
  it('retorna 200 con los ingresos del cliente buscado', async () => {
    const ingresos = [{ id: 2, equipo: { cliente: { nombre: 'Hospital X' } }, etapas: [] }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const res = mockRes();
    await ingresoController.listarIngresosPorNombreDeCliente(
      mockReq({ params: { nombreCliente: 'Hospital' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna 200 con array vacío si no hay coincidencias', async () => {
    mockPrisma.ingreso.findMany.mockResolvedValue([]);

    const res = mockRes();
    await ingresoController.listarIngresosPorNombreDeCliente(
      mockReq({ params: { nombreCliente: 'NoExiste' } }),
      res
    );
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await ingresoController.listarIngresosPorNombreDeCliente(
      mockReq({ params: { nombreCliente: 'Hospital' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarPorEquipo ──────────────────────────────────────────────────────────
describe('listarPorEquipo', () => {
  it('retorna 200 con los ingresos del equipo', async () => {
    const ingresos = [{ id: 1, equipoId: 3, etapas: [] }];
    mockPrisma.ingreso.findMany.mockResolvedValue(ingresos);

    const req = mockReq({ params: { equipoId: '3' } });
    const res = mockRes();
    await ingresoController.listarPorEquipo(req, res);

    expect(mockPrisma.ingreso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { equipoId: 3 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ingresos);
  });

  it('retorna 200 con array vacío si el equipo no tiene ingresos', async () => {
    mockPrisma.ingreso.findMany.mockResolvedValue([]);
    const res = mockRes();
    await ingresoController.listarPorEquipo(mockReq({ params: { equipoId: '7' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.listarPorEquipo(mockReq({ params: { equipoId: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── cerrar ───────────────────────────────────────────────────────────────────
describe('cerrar', () => {
  it('cierra el ingreso y retorna 200', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({ id: 1, estado: 'Abierto' });
    mockPrisma.ingreso.update.mockResolvedValue({ id: 1, estado: 'Cerrado' });

    const req = mockReq({ params: { ingresoId: '1' } });
    const res = mockRes();
    await ingresoController.cerrar(req, res);

    expect(mockPrisma.ingreso.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { estado: 'Cerrado' } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 404 si el ingreso no existe', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue(null);
    const req = mockReq({ params: { ingresoId: '999' } });
    const res = mockRes();
    await ingresoController.cerrar(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.ingreso.update).not.toHaveBeenCalled();
  });

  it('retorna 400 si el ingreso ya está en estado Cerrado', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({ id: 1, estado: 'Cerrado' });
    const req = mockReq({ params: { ingresoId: '1' } });
    const res = mockRes();
    await ingresoController.cerrar(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.ingreso.update).not.toHaveBeenCalled();
  });

  it('retorna 400 si el ingreso está en estado Finalizado', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({ id: 2, estado: 'Finalizado' });
    const res = mockRes();
    await ingresoController.cerrar(mockReq({ params: { ingresoId: '2' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.ingreso.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.cerrar(mockReq({ params: { ingresoId: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
