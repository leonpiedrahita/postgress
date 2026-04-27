jest.mock('../services/whatsappService', () => ({}));

const equipoController = require('../controllers/equipoController');

jest.mock('../services/token');
const tokenServices = require('../services/token');

// Mock de Prisma inyectado en req
const mockPrisma = {
  equipo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  ingreso: { findFirst: jest.fn() },
  historialPropietario: { create: jest.fn() },
  historialServicio: { create: jest.fn() },
  documentoLegal: { create: jest.fn() },
  $transaction: jest.fn(),
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

// ─── listar ───────────────────────────────────────────────────────────────────
describe('listar', () => {
  it('retorna 200 con la lista de equipos', async () => {
    const equipos = [{ id: 1, nombre: 'Equipo A' }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);

    const req = mockReq();
    const res = mockRes();
    await equipoController.listar(req, res);

    expect(mockPrisma.equipo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: { not: 'Inactivo' } } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(equipos);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.listar(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrar ────────────────────────────────────────────────────────────────
describe('registrar', () => {
  const nuevoequipo = {
    nombre: 'Compresor', marca: 'Atlas', serie: 'ABC-001',
    placaDeInventario: 'INV-01', tipoDeContrato: 'Mantenimiento',
    estado: 'Activo', ubicacionNombre: 'Bodega', ubicacionDireccion: 'Calle 1',
    proveedor: { id: 1 }, propietario: { id: 2 }, cliente: { id: 3 },
    fechaDeMovimiento: '2024-01-01', id: 5,
  };

  it('crea equipo e historial y retorna 201', async () => {
    tokenServices.decode.mockResolvedValue({ id: 10 });
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    mockPrisma.equipo.create.mockResolvedValue({ id: 1, ...nuevoequipo });
    mockPrisma.historialPropietario.create.mockResolvedValue({});

    const req = mockReq({ body: { nuevoequipo } });
    const res = mockRes();
    await equipoController.registrar(req, res);

    expect(mockPrisma.equipo.create).toHaveBeenCalled();
    expect(mockPrisma.historialPropietario.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 409 si la serie ya existe', async () => {
    tokenServices.decode.mockResolvedValue({ id: 10 });
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 99, serie: 'ABC-001' });

    const req = mockReq({ body: { nuevoequipo } });
    const res = mockRes();
    await equipoController.registrar(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockPrisma.equipo.create).not.toHaveBeenCalled();
  });

  it('retorna 500 si Prisma lanza error', async () => {
    tokenServices.decode.mockResolvedValue({ id: 10 });
    mockPrisma.equipo.findUnique.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await equipoController.registrar(mockReq({ body: { nuevoequipo } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizar ───────────────────────────────────────────────────────────────
describe('actualizar', () => {
  const body = {
    ubicacionNombre: 'Planta', ubicacionDireccion: 'Cra 10',
    clienteId: 3, propietarioId: 2, placaDeInventario: 'INV-01',
    tipoDeContrato: 'Mantenimiento', estado: 'Activo', proveedorId: 1,
  };

  it('actualiza equipo con transacción y retorna 200', async () => {
    tokenServices.decode.mockResolvedValue({ id: 10 });
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 1 }, {}]);

    const req = mockReq({ params: { id: '1' }, body });
    const res = mockRes();
    await equipoController.actualizar(req, res);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    tokenServices.decode.mockResolvedValue({ id: 10 });
    const req = mockReq({ params: { id: '1' }, body: { ubicacionNombre: 'X' } });
    const res = mockRes();
    await equipoController.actualizar(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el equipo no existe', async () => {
    tokenServices.decode.mockResolvedValue({ id: 10 });
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    const req = mockReq({ params: { id: '999' }, body });
    const res = mockRes();
    await equipoController.actualizar(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── actualizarEstado ─────────────────────────────────────────────────────────
describe('actualizarEstado', () => {
  it('actualiza el estado y retorna 200', async () => {
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, estado: 'Inactivo' });
    const req = mockReq({ params: { id: '1' }, body: { nuevoEstado: 'Inactivo' } });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 400 si no se envía nuevoEstado', async () => {
    const req = mockReq({ params: { id: '1' }, body: {} });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si Prisma lanza P2025', async () => {
    const err = new Error('Not found');
    err.code = 'P2025';
    mockPrisma.equipo.update.mockRejectedValue(err);
    const req = mockReq({ params: { id: '999' }, body: { nuevoEstado: 'Inactivo' } });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('actualiza el estado a Disponible y retorna 200 (sin notificación WP)', async () => {
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, estado: 'Disponible' });

    const req = mockReq({ params: { id: '1' }, body: { nuevoEstado: 'Disponible' } });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('actualiza el estado a En soporte y retorna 200', async () => {
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, estado: 'En soporte' });

    const req = mockReq({ params: { id: '1' }, body: { nuevoEstado: 'En soporte' } });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── buscarequipos ────────────────────────────────────────────────────────────
describe('buscarequipos', () => {
  const equiposData = [{ id: 2, nombre: 'Bomba' }, { id: 1, nombre: 'Motor' }];

  it('retorna equipos paginados y total sin texto de búsqueda', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ id: BigInt(2) }, { id: BigInt(1) }]);
    mockPrisma.equipo.findMany.mockResolvedValue(equiposData);
    mockPrisma.equipo.count.mockResolvedValue(2);

    const req = mockReq({ body: { page: 1, limit: 20 } });
    const res = mockRes();
    await equipoController.buscarequipos(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 2 })
    );
  });

  it('retorna equipos paginados con texto de búsqueda', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ id: BigInt(2) }]);
    mockPrisma.equipo.findMany.mockResolvedValue([equiposData[0]]);
    mockPrisma.equipo.count.mockResolvedValue(1);

    const req = mockReq({ body: { texto: 'Bomba', page: 1, limit: 20 } });
    const res = mockRes();
    await equipoController.buscarequipos(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 1 })
    );
  });

  it('mantiene el orden devuelto por el raw query', async () => {
    const rawIds = [{ id: BigInt(5) }, { id: BigInt(3) }, { id: BigInt(8) }];
    const prismaEquipos = [
      { id: 3, nombre: 'C' }, { id: 8, nombre: 'A' }, { id: 5, nombre: 'B' },
    ];
    mockPrisma.$queryRaw.mockResolvedValue(rawIds);
    mockPrisma.equipo.findMany.mockResolvedValue(prismaEquipos);
    mockPrisma.equipo.count.mockResolvedValue(3);

    const res = mockRes();
    await equipoController.buscarequipos(mockReq({ body: { page: 1, limit: 20 } }), res);

    const { equipos } = res.json.mock.calls[0][0];
    expect(equipos.map(e => e.id)).toEqual([5, 3, 8]);
  });

  it('retorna 500 si ocurre un error', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.buscarequipos(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizar 500 ───────────────────────────────────────────────────────────
describe('actualizar — error 500', () => {
  const body = {
    ubicacionNombre: 'Planta', ubicacionDireccion: 'Cra 10',
    clienteId: 3, propietarioId: 2, placaDeInventario: 'INV-01',
    tipoDeContrato: 'Mantenimiento', estado: 'Activo', proveedorId: 1,
  };

  it('retorna 500 si la transacción falla', async () => {
    tokenServices.decode.mockResolvedValue({ id: 10 });
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1 }); // evita rechazo sin manejar en el array
    mockPrisma.historialPropietario.create.mockResolvedValue({}); // idem
    mockPrisma.$transaction.mockRejectedValue(new Error('TX error'));

    const res = mockRes();
    await equipoController.actualizar(mockReq({ params: { id: '1' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarEstado — error 500 genérico ────────────────────────────────────
describe('actualizarEstado — error genérico', () => {
  it('retorna 500 si Prisma lanza error no-P2025', async () => {
    mockPrisma.equipo.update.mockRejectedValue(new Error('Generic DB error'));
    const req = mockReq({ params: { id: '1' }, body: { nuevoEstado: 'Activo' } });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrarreporte ─────────────────────────────────────────────────────────
describe('registrarreporte', () => {
  it('crea historialServicio y retorna 201', async () => {
    tokenServices.decode.mockResolvedValue({ id: 5 });
    mockPrisma.historialServicio.create.mockResolvedValue({ id: 100 });

    const req = mockReq({
      body: { id_equipo: '1', reporte: { fechadefinalizacion: '2024-01-01', tipodeasistencia: 'Preventivo' } },
      idcreada: 'RPT-001',
    });
    const res = mockRes();
    await equipoController.registrarreporte(req, res);

    expect(mockPrisma.historialServicio.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    tokenServices.decode.mockResolvedValue({ id: 5 });
    mockPrisma.historialServicio.create.mockRejectedValue(new Error('DB error'));

    const req = mockReq({
      body: { id_equipo: '1', reporte: { fechadefinalizacion: '2024-01-01', tipodeasistencia: 'Preventivo' } },
      idcreada: 'RPT-001',
    });
    const res = mockRes();
    await equipoController.registrarreporte(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrarreporteexterno ──────────────────────────────────────────────────
describe('registrarreporteexterno', () => {
  const reporte = { fechadefinalizacion: '2024-06-01', tipodeasistencia: 'Correctivo' };

  it('crea historialServicio externo y retorna 201', async () => {
    tokenServices.decode.mockResolvedValue({ id: 7 });
    mockPrisma.historialServicio.create.mockResolvedValue({ id: 200 });

    const req = mockReq({
      body: { id_equipo: '2', reporte: JSON.stringify(reporte) },
    });
    const res = mockRes();
    res.locals = { idcreada: 'RPT-EXT-001', llave: 's3-key' };
    await equipoController.registrarreporteexterno(req, res);

    expect(mockPrisma.historialServicio.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    tokenServices.decode.mockResolvedValue({ id: 7 });
    mockPrisma.historialServicio.create.mockRejectedValue(new Error('DB error'));

    const req = mockReq({
      body: { id_equipo: '2', reporte: JSON.stringify(reporte) },
    });
    const res = mockRes();
    res.locals = { idcreada: 'RPT-EXT-001', llave: 's3-key' };
    await equipoController.registrarreporteexterno(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrardocumento ───────────────────────────────────────────────────────
describe('registrardocumento', () => {
  it('crea documentoLegal y retorna 201', async () => {
    mockPrisma.documentoLegal.create.mockResolvedValue({ id: 50 });

    const req = mockReq({
      body: { id_equipo: '3', nombredocumento: JSON.stringify('Contrato.pdf') },
    });
    const res = mockRes();
    res.locals = { llave: 'doc-s3-key' };
    await equipoController.registrardocumento(req, res);

    expect(mockPrisma.documentoLegal.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.documentoLegal.create.mockRejectedValue(new Error('DB error'));

    const req = mockReq({
      body: { id_equipo: '3', nombredocumento: JSON.stringify('Contrato.pdf') },
    });
    const res = mockRes();
    res.locals = { llave: 'doc-s3-key' };
    await equipoController.registrardocumento(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── buscar ───────────────────────────────────────────────────────────────────
describe('buscar', () => {
  it('retorna 200 con los equipos encontrados', async () => {
    const equipos = [{ id: 1 }, { id: 2 }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);

    const req = mockReq({ body: { buscar: { nombre: { contains: 'Motor' } } } });
    const res = mockRes();
    await equipoController.buscar(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(equipos);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.buscar(mockReq({ body: { buscar: {} } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listaruno ────────────────────────────────────────────────────────────────
describe('listaruno', () => {
  it('retorna 200 con el equipo encontrado', async () => {
    const equipo = { id: 1, nombre: 'Ventilador' };
    mockPrisma.equipo.findUnique.mockResolvedValue(equipo);

    const res = mockRes();
    await equipoController.listaruno(mockReq({ params: { id: '1' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(equipo);
  });

  it('retorna 404 si el equipo no existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await equipoController.listaruno(mockReq({ params: { id: '999' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.listaruno(mockReq({ params: { id: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarcronograma ─────────────────────────────────────────────────────
describe('actualizarcronograma', () => {
  it('actualiza la fecha de preventivo y retorna 200', async () => {
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, fechaDePreventivo: new Date('2025-06-01') });

    const req = mockReq({ body: { id_equipo: '1', fechaDePreventivo: '2025-06-01' } });
    const res = mockRes();
    await equipoController.actualizarcronograma(req, res);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.update.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ body: { id_equipo: '1', fechaDePreventivo: '2025-06-01' } });
    const res = mockRes();
    await equipoController.actualizarcronograma(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarTodos ──────────────────────────────────────────────────────────────
describe('listarTodos', () => {
  it('retorna 200 con todos los equipos activos', async () => {
    const equipos = [{ id: 1, nombre: 'Motor' }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);

    const res = mockRes();
    await equipoController.listarTodos(mockReq(), res);

    expect(mockPrisma.equipo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: { not: 'Inactivo' } } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(equipos);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.listarTodos(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});