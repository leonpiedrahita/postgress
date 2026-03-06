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
