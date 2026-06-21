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
  documentoLegal: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  historialEstadoEquipo: { create: jest.fn(), findMany: jest.fn() },
  auditLog: { findMany: jest.fn() },
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
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, estado: 'Activo' });
    tokenServices.decode.mockResolvedValue({ nombre: 'Test User' });
    mockPrisma.$transaction.mockResolvedValue([{ id: 1, estado: 'Inactivo' }]);
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

  it('retorna 404 si el equipo no existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    const req = mockReq({ params: { id: '999' }, body: { nuevoEstado: 'Inactivo' } });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('actualiza el estado a Disponible y retorna 200 (sin notificación WP)', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, estado: 'Activo' });
    tokenServices.decode.mockResolvedValue({ nombre: 'Test User' });
    mockPrisma.$transaction.mockResolvedValue([{ id: 1, estado: 'Disponible' }]);
    const req = mockReq({ params: { id: '1' }, body: { nuevoEstado: 'Disponible' } });
    const res = mockRes();
    await equipoController.actualizarEstado(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('actualiza el estado a En soporte y retorna 200', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, estado: 'Activo' });
    tokenServices.decode.mockResolvedValue({ nombre: 'Test User' });
    mockPrisma.$transaction.mockResolvedValue([{ id: 1, estado: 'En soporte' }]);
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
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, estado: 'Activo' });
    tokenServices.decode.mockResolvedValue({ nombre: 'Test User' });
    mockPrisma.$transaction.mockRejectedValue(new Error('Generic DB error'));
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

// ─── eliminarDocumentoLegal ───────────────────────────────────────────────────
describe('eliminarDocumentoLegal', () => {
  it('retorna 400 si el id no es un número válido', async () => {
    const res = mockRes();
    await equipoController.eliminarDocumentoLegal(mockReq({ params: { id: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 si el documento no existe', async () => {
    mockPrisma.documentoLegal.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await equipoController.eliminarDocumentoLegal(mockReq({ params: { id: '99' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('marca el documento como eliminado y retorna 200', async () => {
    mockPrisma.documentoLegal.findUnique.mockResolvedValue({ id: 1, eliminado: false });
    mockPrisma.documentoLegal.update.mockResolvedValue({ id: 1, eliminado: true });

    const res = mockRes();
    await equipoController.eliminarDocumentoLegal(mockReq({ params: { id: '1' } }), res);

    expect(mockPrisma.documentoLegal.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { eliminado: true } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.documentoLegal.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.eliminarDocumentoLegal(mockReq({ params: { id: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarAuditLog ───────────────────────────────────────────────────────────
describe('listarAuditLog', () => {
  it('retorna 400 si el id no es un número válido', async () => {
    const res = mockRes();
    await equipoController.listarAuditLog(mockReq({ params: { id: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 200 con los logs de auditoría', async () => {
    const logs = [{ id: 1, action: 'UPDATE', tableName: 'Equipo', recordId: 5 }];
    mockPrisma.auditLog.findMany.mockResolvedValue(logs);

    const res = mockRes();
    await equipoController.listarAuditLog(mockReq({ params: { id: '5' } }), res);

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tableName: 'Equipo', recordId: 5 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(logs);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.auditLog.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.listarAuditLog(mockReq({ params: { id: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarAtencion ───────────────────────────────────────────────────────
describe('actualizarAtencion', () => {
  it('retorna 400 si el valor de atencion es inválido', async () => {
    const req = mockReq({ params: { id: '1' }, body: { atencion: 'ValorInvalido' } });
    const res = mockRes();
    await equipoController.actualizarAtencion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('actualiza la atención y retorna 200', async () => {
    const equipo = { id: 1, nombre: 'Motor', serie: 'S-01', atencion: 'Autorizado' };
    mockPrisma.equipo.update.mockResolvedValue(equipo);

    const req = mockReq({ params: { id: '1' }, body: { atencion: 'Autorizado' } });
    const res = mockRes();
    await equipoController.actualizarAtencion(req, res);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { atencion: 'Autorizado' } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('acepta atencion null y limpia el campo', async () => {
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, atencion: null });
    const req = mockReq({ params: { id: '1' }, body: { atencion: null } });
    const res = mockRes();
    await equipoController.actualizarAtencion(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 404 si Prisma lanza error P2025', async () => {
    const err = new Error('Record not found');
    err.code = 'P2025';
    mockPrisma.equipo.update.mockRejectedValue(err);

    const req = mockReq({ params: { id: '999' }, body: { atencion: 'MP' } });
    const res = mockRes();
    await equipoController.actualizarAtencion(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error genérico', async () => {
    mockPrisma.equipo.update.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ params: { id: '1' }, body: { atencion: 'MP' } });
    const res = mockRes();
    await equipoController.actualizarAtencion(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarHistorialEstado ────────────────────────────────────────────────────
describe('listarHistorialEstado', () => {
  it('retorna 400 si el id no es un número válido', async () => {
    const res = mockRes();
    await equipoController.listarHistorialEstado(mockReq({ params: { id: 'xyz' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 200 con el historial de estados', async () => {
    const historial = [{ id: 1, equipoId: 3, estado: 'Inactivo', fecha: new Date() }];
    mockPrisma.historialEstadoEquipo.findMany.mockResolvedValue(historial);

    const res = mockRes();
    await equipoController.listarHistorialEstado(mockReq({ params: { id: '3' } }), res);

    expect(mockPrisma.historialEstadoEquipo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { equipoId: 3 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(historial);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.historialEstadoEquipo.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.listarHistorialEstado(mockReq({ params: { id: '3' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listarPreventivos ────────────────────────────────────────────────────────
describe('listarPreventivos', () => {
  it('retorna 200 con los equipos con preventivo pendiente', async () => {
    const equipos = [{ id: 1, nombre: 'Monitor', fechaDePreventivo: new Date('2025-03-01') }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);

    const res = mockRes();
    await equipoController.listarPreventivos(mockReq(), res);

    expect(mockPrisma.equipo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fechaDePreventivo: { not: null } }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(equipos);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await equipoController.listarPreventivos(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── importarAtencion ─────────────────────────────────────────────────────────
describe('importarAtencion', () => {
  it('retorna 400 si registros no es un array', async () => {
    const req = mockReq({ body: { registros: 'no-array' } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si registros es un array vacío', async () => {
    const req = mockReq({ body: { registros: [] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('clasifica Cartera-MP cuando dias>=90 y preventivo vencido', async () => {
    // fechaDePreventivo en 2020 + Anual → vencido
    const equipos = [{
      id: 1,
      fechaDePreventivo: new Date('2020-01-01'),
      cliente: { nit: '900111222' },
      proveedor: { nit: '900111222', nombre: 'Proveedor X' },
      referencia: { periodicidadmantenimiento: 'Anual' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: '900111222', dias: 100 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.actualizados).toBe(1);
    expect(body.enBlanco).toBe(0);
    // update debe haber sido llamado con 'Cartera - MP'
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'Cartera - MP' } })
    );
  });

  it('clasifica Cartera cuando dias>=90 y preventivo no vencido', async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1); // preventivo válido por 1 año más
    const equipos = [{
      id: 2,
      fechaDePreventivo: futuro,
      cliente: { nit: '123' },
      proveedor: { nit: '123', nombre: 'X' },
      referencia: { periodicidadmantenimiento: 'Anual' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: '123', dias: 95 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'Cartera' } })
    );
  });

  it('clasifica MP cuando dias<90 y preventivo vencido', async () => {
    const equipos = [{
      id: 3,
      fechaDePreventivo: new Date('2020-01-01'),
      cliente: { nit: '456' },
      proveedor: { nit: '456', nombre: 'X' },
      referencia: { periodicidadmantenimiento: 'Semestral' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: '456', dias: 30 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'MP' } })
    );
  });

  it('clasifica Autorizado cuando nit no está en cartera y preventivo no vencido', async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const equipos = [{
      id: 4,
      fechaDePreventivo: futuro,
      cliente: { nit: '789' },
      proveedor: { nit: '789', nombre: 'X' },
      referencia: { periodicidadmantenimiento: 'Anual' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    // registros con NIT diferente → equipo queda en enBlanco
    const req = mockReq({ body: { registros: [{ nit: '000', dias: 0 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.enBlanco).toBe(1);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'Autorizado' } })
    );
  });

  it('usa nit del cliente cuando el proveedor es Biosystems', async () => {
    const equipos = [{
      id: 5,
      fechaDePreventivo: null,
      cliente: { nit: 'CLI-001' },
      proveedor: { nit: '811003513', nombre: 'Biosystems' }, // NIT_BIOSYSTEMS
      referencia: { periodicidadmantenimiento: 'Libre de mantenimiento' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: 'CLI-001', dias: 0 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'Autorizado' } })
    );
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.findMany.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ body: { registros: [{ nit: '123', dias: 0 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('ignora el documento de cartera cuando proveedor y cliente son Biosystems (Autorizado, preventivo vigente)', async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const equipos = [{
      id: 6,
      fechaDePreventivo: futuro,
      cliente: { nit: '811003513' }, // NIT_BIOSYSTEMS
      proveedor: { nit: '811003513', nombre: 'Biosystems' }, // NIT_BIOSYSTEMS
      referencia: { periodicidadmantenimiento: 'Anual' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    // El documento marca cartera vencida para Biosystems, pero debe ignorarse igual.
    const req = mockReq({ body: { registros: [{ nit: '811003513', dias: 200 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.propioBiosystems).toBe(1);
    expect(body.actualizados).toBe(0);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'Autorizado' } })
    );
  });

  it('ignora el documento de cartera cuando proveedor y cliente son Biosystems (MP, preventivo vencido)', async () => {
    const equipos = [{
      id: 7,
      fechaDePreventivo: new Date('2020-01-01'),
      cliente: { nit: '811003513' },
      proveedor: { nit: '811003513', nombre: 'Biosystems' },
      referencia: { periodicidadmantenimiento: 'Anual' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: '811003513', dias: 200 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'MP' } })
    );
  });
});

// ─── importarAsesor ───────────────────────────────────────────────────────────
describe('importarAsesor', () => {
  it('retorna 400 si registros no es un array', async () => {
    const req = mockReq({ body: { registros: null } });
    const res = mockRes();
    await equipoController.importarAsesor(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si registros es un array vacío', async () => {
    const req = mockReq({ body: { registros: [] } });
    const res = mockRes();
    await equipoController.importarAsesor(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('asigna asesor por NIT y retorna 200 con conteos correctos', async () => {
    const equipos = [
      { id: 1, cliente: { nit: 'CLI-A' }, proveedor: { nit: 'PROV-A' } },
      { id: 2, cliente: { nit: 'CLI-B' }, proveedor: { nit: 'PROV-B' } }, // sin asesor
    ];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const req = mockReq({ body: { registros: [{ nit: 'PROV-A', asesor: 'Juan Pérez' }] } });
    const res = mockRes();
    await equipoController.importarAsesor(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.actualizados).toBe(1);
    expect(body.enBlanco).toBe(1);
    expect(body.total).toBe(2);
  });

  it('usa nit del cliente cuando el proveedor es Biosystems', async () => {
    const equipos = [{
      id: 3,
      cliente: { nit: 'CLI-X' },
      proveedor: { nit: '811003513' }, // NIT_BIOSYSTEMS
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: 'CLI-X', asesor: 'María López' }] } });
    const res = mockRes();
    await equipoController.importarAsesor(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { asesor: 'María López' } })
    );
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.equipo.findMany.mockRejectedValue(new Error('DB error'));
    const req = mockReq({ body: { registros: [{ nit: '123', asesor: 'Test' }] } });
    const res = mockRes();
    await equipoController.importarAsesor(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── importarAtencion — ramas residuales de preventivoVencido ─────────────────
describe('importarAtencion — preventivoVencido ramas Trimestral y desconocida', () => {
  it('clasifica MP cuando periodicidad es Trimestral y el preventivo está vencido', async () => {
    const equipos = [{
      id: 10,
      fechaDePreventivo: new Date('2020-01-01'), // claramente vencido
      cliente: { nit: 'T-001' },
      proveedor: { nit: 'T-001', nombre: 'X' },
      referencia: { periodicidadmantenimiento: 'Trimestral' },
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: 'T-001', dias: 10 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'MP' } })
    );
  });

  it('clasifica Autorizado cuando periodicidad es desconocida (else return false)', async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const equipos = [{
      id: 11,
      fechaDePreventivo: futuro,
      cliente: { nit: 'D-001' },
      proveedor: { nit: 'D-001', nombre: 'X' },
      referencia: { periodicidadmantenimiento: 'Bienal' }, // periodicidad no reconocida → else return false
    }];
    mockPrisma.equipo.findMany.mockResolvedValue(equipos);
    mockPrisma.equipo.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const req = mockReq({ body: { registros: [{ nit: 'D-001', dias: 10 }] } });
    const res = mockRes();
    await equipoController.importarAtencion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencion: 'Autorizado' } })
    );
  });
});