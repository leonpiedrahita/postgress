jest.mock('../services/whatsappService', () => ({
  notificarIngresoEquipo: jest.fn().mockResolvedValue(null),
  notificarCambioEtapa: jest.fn().mockResolvedValue(null),
  notificarConfirmacionMovimiento: jest.fn().mockResolvedValue(null),
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
    update: jest.fn(),
  },
  etapa: {
    update: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn().mockResolvedValue([{}, {}]),
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

  it('acepta comentario y responsable null (campos opcionales según schema)', async () => {
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.ingreso.create.mockResolvedValue({ id: 10, etapas: [] });

    const etapaConNulos = {
      ...etapaValida,
      comentario: null,
      responsable: null,
    };
    const req = mockReq({ body: { equipo: { id: 1 }, etapa: etapaConNulos } });
    const res = mockRes();
    await ingresoController.registrarIngreso(req, res);

    expect(mockPrisma.ingreso.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('llama a notificarIngresoEquipo cuando la etapa no es "Equipo nuevo"', async () => {
    const { notificarIngresoEquipo } = require('../services/whatsappService');
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.ingreso.create.mockResolvedValue({ id: 10, etapas: [] });

    const req = mockReq({ body: { equipo: { id: 1 }, etapa: etapaValida } });
    const res = mockRes();
    await ingresoController.registrarIngreso(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(notificarIngresoEquipo).toHaveBeenCalledWith(10);
  });

  it('omite notificarIngresoEquipo cuando etapaSeleccionada es "Equipo nuevo"', async () => {
    const { notificarIngresoEquipo } = require('../services/whatsappService');
    mockPrisma.ingreso.findFirst.mockResolvedValue(null);
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.ingreso.create.mockResolvedValue({ id: 10, etapas: [] });

    const etapaEquipoNuevo = { ...etapaValida, etapaSeleccionada: 'Equipo nuevo' };
    const req = mockReq({ body: { equipo: { id: 1 }, etapa: etapaEquipoNuevo } });
    const res = mockRes();
    await ingresoController.registrarIngreso(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(notificarIngresoEquipo).not.toHaveBeenCalled();
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

  // La etapa más reciente (pendiente de confirmar) siempre debe quedar con
  // responsable null: ese campo se completa cuando se cierre al registrarse
  // la siguiente etapa (ahí queda quién la cerró). Ver listarMovimientosPendientes,
  // que toma el responsable de la PENÚLTIMA etapa para "Registrado por".
  it('crea la etapa nueva con responsable null', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue(ingresoAbierto);
    mockPrisma.etapa.update.mockResolvedValue({});
    mockPrisma.etapa.create.mockResolvedValue({ id: 11, nombre: bodyValido.nombre });
    mockPrisma.ingreso.update.mockResolvedValue({ id: 1 });

    const req = mockReq({ params: { ingresoId: '1' }, body: bodyValido });
    const res = mockRes();
    await ingresoController.agregarEtapa(req, res);

    expect(mockPrisma.etapa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsable: null }),
      })
    );
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

// ─── agregarEtapa — lógica de campo confirmado ────────────────────────────────
describe('agregarEtapa — campo confirmado', () => {
  const base = {
    nombre: 'Revisión',
    comentario: 'ok',
    responsable: 'Ana',
    fecha: '2024-03-01',
    etapaActual: 2,
    ultimaEtapa: 2,
    estado: 'Abierto',
  };

  const setupMocks = () => {
    mockPrisma.etapa.update.mockResolvedValue({});
    mockPrisma.etapa.create.mockResolvedValue({ id: 20 });
    mockPrisma.ingreso.update.mockResolvedValue({ id: 1 });
  };

  it('crea etapa con confirmado=false cuando la ubicación cambia a una no especial', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({
      id: 1, estado: 'Abierto',
      etapas: [{ id: 10, ubicacion: 'Bodega Central' }],
    });
    setupMocks();

    const req = mockReq({ params: { ingresoId: '1' }, body: { ...base, ubicacion: 'Taller de Ingeniería' } });
    await ingresoController.agregarEtapa(req, mockRes());

    expect(mockPrisma.etapa.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ confirmado: false }) })
    );
  });

  it('crea etapa con confirmado=true cuando la ubicación destino contiene "cliente"', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({
      id: 1, estado: 'Abierto',
      etapas: [{ id: 10, ubicacion: 'Bodega Central' }],
    });
    setupMocks();

    const req = mockReq({ params: { ingresoId: '1' }, body: { ...base, ubicacion: 'Cliente' } });
    await ingresoController.agregarEtapa(req, mockRes());

    expect(mockPrisma.etapa.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ confirmado: true }) })
    );
  });

  it('crea etapa con confirmado=true cuando la ubicación destino es "Dado de Baja"', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({
      id: 1, estado: 'Abierto',
      etapas: [{ id: 10, ubicacion: 'Bodega Central' }],
    });
    setupMocks();

    const req = mockReq({ params: { ingresoId: '1' }, body: { ...base, ubicacion: 'Dado de Baja' } });
    await ingresoController.agregarEtapa(req, mockRes());

    expect(mockPrisma.etapa.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ confirmado: true }) })
    );
  });

  it('crea etapa con confirmado=true cuando la ubicación no cambia', async () => {
    mockPrisma.ingreso.findUnique.mockResolvedValue({
      id: 1, estado: 'Abierto',
      etapas: [{ id: 10, ubicacion: 'Bodega Central' }],
    });
    setupMocks();

    const req = mockReq({ params: { ingresoId: '1' }, body: { ...base, ubicacion: 'Bodega Central' } });
    await ingresoController.agregarEtapa(req, mockRes());

    expect(mockPrisma.etapa.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ confirmado: true }) })
    );
  });
});

// ─── confirmarMovimiento ──────────────────────────────────────────────────────
describe('confirmarMovimiento', () => {
  const etapaBodega = {
    id: 5,
    ingresoId: 1,
    ubicacion: 'Bodega Central',
    confirmado: false,
    ingreso: { id: 1, equipoId: 10, estado: 'Abierto' },
  };
  const etapaCuarentena = {
    id: 6,
    ingresoId: 1,
    ubicacion: 'Cuarentena',
    confirmado: false,
    ingreso: { id: 1, equipoId: 10, estado: 'Abierto' },
  };
  const etapaTaller = {
    id: 7,
    ingresoId: 1,
    ubicacion: 'Taller Snibe',
    confirmado: false,
    ingreso: { id: 1, equipoId: 10, estado: 'Abierto' },
  };

  const setupConfirmar = () => {
    mockPrisma.etapa.update.mockResolvedValue({});
  };

  it('retorna 400 si ingresoId o etapaId no son números', async () => {
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: 'abc', etapaId: '5' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si la etapa no existe', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '999' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 400 si la etapa no pertenece al ingreso indicado', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue({ ...etapaBodega, ingresoId: 99 });
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si la etapa ya fue confirmada', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue({ ...etapaBodega, confirmado: true });
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si el ingreso ya está cerrado', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue({
      ...etapaBodega, ingreso: { ...etapaBodega.ingreso, estado: 'Cerrado' },
    });
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 403 si rol "soporte" intenta confirmar ubicación de bodega', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaBodega);
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'soporte', nombre: 'Pedro' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 403 si rol "bodega" intenta confirmar ubicación de cuarentena', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaCuarentena);
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '6' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 403 si rol "ingresos" intenta confirmar cuarentena', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaCuarentena);
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '6' }, usuario: { rol: 'ingresos', nombre: 'Luis' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('bodega puede confirmar ubicación de bodega — retorna 200', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaBodega);
    setupConfirmar();
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(mockPrisma.etapa.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: expect.objectContaining({ confirmado: true, confirmadoPor: 'Ana' }) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Regresión: confirmar un movimiento interno NO debe tocar Equipo.ubicacionNombre
  // ni ubicacionDireccion — esos campos representan la ciudad/sede del cliente,
  // no la ubicación interna de seguimiento (Etapa.ubicacion).
  it('no modifica la ciudad/sede del cliente (Equipo.ubicacionNombre) al confirmar', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaBodega);
    setupConfirmar();
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(mockPrisma.equipo.update).not.toHaveBeenCalled();
  });

  it('ingresos puede confirmar ubicación de bodega — retorna 200', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaBodega);
    setupConfirmar();
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'ingresos', nombre: 'Luis' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('soporte puede confirmar cuarentena — retorna 200', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaCuarentena);
    setupConfirmar();
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '6' }, usuario: { rol: 'soporte', nombre: 'Pedro' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('lumira puede confirmar taller de ingeniería — retorna 200', async () => {
    mockPrisma.etapa.findUnique.mockResolvedValue(etapaTaller);
    setupConfirmar();
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '7' }, usuario: { rol: 'lumira', nombre: 'María' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('administrador puede confirmar cualquier tipo de ubicación', async () => {
    for (const etapa of [etapaBodega, etapaCuarentena, etapaTaller]) {
      jest.clearAllMocks();
      mockPrisma.etapa.findUnique.mockResolvedValue(etapa);
      setupConfirmar();
      const res = mockRes();
      await ingresoController.confirmarMovimiento(
        mockReq({ params: { ingresoId: '1', etapaId: String(etapa.id) }, usuario: { rol: 'administrador', nombre: 'Admin' } }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(200);
    }
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.etapa.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.confirmarMovimiento(
      mockReq({ params: { ingresoId: '1', etapaId: '5' }, usuario: { rol: 'bodega', nombre: 'Ana' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── contarMovimientosPendientes ──────────────────────────────────────────────
describe('contarMovimientosPendientes', () => {
  it('retorna 200 con el conteo de etapas pendientes', async () => {
    mockPrisma.etapa.count.mockResolvedValue(3);
    const res = mockRes();
    await ingresoController.contarMovimientosPendientes(mockReq(), res);

    expect(mockPrisma.etapa.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { confirmado: false, ingreso: { estado: 'Abierto' } } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 3 });
  });

  it('retorna 200 con count 0 cuando no hay pendientes', async () => {
    mockPrisma.etapa.count.mockResolvedValue(0);
    const res = mockRes();
    await ingresoController.contarMovimientosPendientes(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 0 });
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.etapa.count.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.contarMovimientosPendientes(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarMovimientosPendientes ──────────────────────────────────────────────
describe('listarMovimientosPendientes', () => {
  const etapasPendientes = [
    {
      id: 5, ubicacion: 'Bodega Central', confirmado: false, createdAt: new Date(),
      ingreso: {
        id: 1,
        equipo: { id: 10, nombre: 'Ventilador', serie: 'V-001', cliente: { nombre: 'Hospital A' } },
        etapas: [{ id: 4, responsable: 'Leo' }], // penúltima etapa
      },
    },
    {
      id: 6, ubicacion: 'Cuarentena', confirmado: false, createdAt: new Date(),
      ingreso: {
        id: 2,
        equipo: { id: 11, nombre: 'Monitor', serie: 'M-002', cliente: { nombre: 'Clínica B' } },
        etapas: [], // primera etapa del ingreso, sin penúltima
      },
    },
  ];

  it('retorna 200 con el responsable de la penúltima etapa, no el de la pendiente', async () => {
    mockPrisma.etapa.findMany.mockResolvedValue(etapasPendientes);
    const res = mockRes();
    await ingresoController.listarMovimientosPendientes(mockReq(), res);

    expect(mockPrisma.etapa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { confirmado: false, ingreso: { estado: 'Abierto' } } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 5, responsable: 'Leo', ingreso: { id: 1, equipo: etapasPendientes[0].ingreso.equipo } }),
      expect.objectContaining({ id: 6, responsable: null, ingreso: { id: 2, equipo: etapasPendientes[1].ingreso.equipo } }),
    ]);
  });

  it('retorna 200 con array vacío cuando no hay pendientes', async () => {
    mockPrisma.etapa.findMany.mockResolvedValue([]);
    const res = mockRes();
    await ingresoController.listarMovimientosPendientes(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.etapa.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await ingresoController.listarMovimientosPendientes(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
