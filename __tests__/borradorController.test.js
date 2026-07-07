jest.mock('../services/token');

const tokenServices = require('../services/token');
const borradorController = require('../controllers/borradorController');

const mockPrisma = {
  borrador: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
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

beforeEach(() => {
  jest.clearAllMocks();
  // Usuario autenticado por defecto: id 7
  tokenServices.decode.mockResolvedValue({ id: 7, nombre: 'Leo', rol: 'soporte' });
});

// ─── guardar — validación de entrada ──────────────────────────────────────────
describe('guardar — validación de entrada', () => {
  it('retorna 400 si falta equipoId', async () => {
    const res = mockRes();
    await borradorController.guardar(mockReq({ body: { datos: { campo: 'valor' } } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.borrador.create).not.toHaveBeenCalled();
    expect(mockPrisma.borrador.updateMany).not.toHaveBeenCalled();
  });

  it('retorna 400 si faltan datos', async () => {
    const res = mockRes();
    await borradorController.guardar(mockReq({ body: { equipoId: 3 } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.borrador.create).not.toHaveBeenCalled();
  });

  it('retorna 400 si el body está vacío', async () => {
    const res = mockRes();
    await borradorController.guardar(mockReq({ body: {} }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── guardar — actualización con id (propiedad) ───────────────────────────────
describe('guardar — actualización con id', () => {
  it('retorna 403 si el borrador es de otro usuario (updateMany count 0)', async () => {
    mockPrisma.borrador.updateMany.mockResolvedValue({ count: 0 });

    const res = mockRes();
    await borradorController.guardar(
      mockReq({ body: { id: 5, equipoId: 3, datos: { a: 1 } } }),
      res
    );

    // El filtro de propiedad va en el propio updateMany (operación atómica)
    expect(mockPrisma.borrador.updateMany).toHaveBeenCalledWith({
      where: { id: 5, usuarioId: 7 },
      data: { datos: { a: 1 } },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'No autorizado para modificar este borrador' });
    expect(mockPrisma.borrador.findUnique).not.toHaveBeenCalled();
  });

  it('actualiza el borrador propio (count 1) y retorna 200 con el borrador', async () => {
    const borrador = { id: 5, usuarioId: 7, equipoId: 3, datos: { a: 1 } };
    mockPrisma.borrador.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.borrador.findUnique.mockResolvedValue(borrador);

    const res = mockRes();
    await borradorController.guardar(
      mockReq({ body: { id: 5, equipoId: 3, datos: { a: 1 } } }),
      res
    );

    expect(mockPrisma.borrador.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Borrador guardado', borrador });
    expect(mockPrisma.borrador.create).not.toHaveBeenCalled();
  });

  it('convierte id string a entero en el where del updateMany', async () => {
    mockPrisma.borrador.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.borrador.findUnique.mockResolvedValue({ id: 8 });

    const res = mockRes();
    await borradorController.guardar(
      mockReq({ body: { id: '8', equipoId: 3, datos: { a: 1 } } }),
      res
    );

    expect(mockPrisma.borrador.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 8, usuarioId: 7 } })
    );
  });
});

// ─── guardar — creación sin id ────────────────────────────────────────────────
describe('guardar — creación sin id', () => {
  it('crea el borrador con el usuarioId del token y retorna 200', async () => {
    const nuevo = { id: 10, usuarioId: 7, equipoId: 3, datos: { a: 1 } };
    mockPrisma.borrador.create.mockResolvedValue(nuevo);

    const res = mockRes();
    await borradorController.guardar(
      mockReq({ body: { equipoId: '3', datos: { a: 1 } } }),
      res
    );

    expect(mockPrisma.borrador.create).toHaveBeenCalledWith({
      data: { usuarioId: 7, equipoId: 3, datos: { a: 1 } },
    });
    expect(mockPrisma.borrador.updateMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Borrador guardado', borrador: nuevo });
  });
});

// ─── guardar — error 500 ──────────────────────────────────────────────────────
describe('guardar — error 500', () => {
  it('retorna 500 con mensaje genérico si Prisma lanza error', async () => {
    mockPrisma.borrador.create.mockRejectedValue(new Error('detalle interno de la BD'));

    const res = mockRes();
    await borradorController.guardar(
      mockReq({ body: { equipoId: 3, datos: { a: 1 } } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    const respuesta = JSON.stringify(res.json.mock.calls[0][0]);
    expect(respuesta).not.toContain('detalle interno de la BD');
  });
});

// ─── listar ───────────────────────────────────────────────────────────────────
describe('listar', () => {
  it('retorna 200 solo con los borradores del usuario autenticado', async () => {
    const borradores = [{ id: 1, usuarioId: 7, equipo: {} }];
    mockPrisma.borrador.findMany.mockResolvedValue(borradores);

    const res = mockRes();
    await borradorController.listar(mockReq(), res);

    expect(mockPrisma.borrador.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 7 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(borradores);
  });

  it('retorna 500 genérico si Prisma lanza error', async () => {
    mockPrisma.borrador.findMany.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await borradorController.listar(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});

// ─── obtener ──────────────────────────────────────────────────────────────────
describe('obtener', () => {
  it('retorna 404 si el borrador no existe', async () => {
    mockPrisma.borrador.findUnique.mockResolvedValue(null);

    const res = mockRes();
    await borradorController.obtener(mockReq({ params: { id: '999' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Borrador no encontrado' });
  });

  it('retorna 403 si el borrador pertenece a otro usuario', async () => {
    mockPrisma.borrador.findUnique.mockResolvedValue({ id: 5, usuarioId: 99, datos: {} });

    const res = mockRes();
    await borradorController.obtener(mockReq({ params: { id: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'No autorizado' });
  });

  it('retorna 200 con el borrador si pertenece al usuario', async () => {
    const borrador = { id: 5, usuarioId: 7, datos: { a: 1 }, equipo: {} };
    mockPrisma.borrador.findUnique.mockResolvedValue(borrador);

    const res = mockRes();
    await borradorController.obtener(mockReq({ params: { id: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(borrador);
  });

  it('retorna 500 genérico si Prisma lanza error', async () => {
    mockPrisma.borrador.findUnique.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await borradorController.obtener(mockReq({ params: { id: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});

// ─── eliminar ─────────────────────────────────────────────────────────────────
describe('eliminar', () => {
  it('retorna 404 si el borrador no existe', async () => {
    mockPrisma.borrador.findUnique.mockResolvedValue(null);

    const res = mockRes();
    await borradorController.eliminar(mockReq({ params: { id: '999' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.borrador.delete).not.toHaveBeenCalled();
  });

  it('retorna 403 si el borrador pertenece a otro usuario y NO lo elimina', async () => {
    mockPrisma.borrador.findUnique.mockResolvedValue({ id: 5, usuarioId: 99 });

    const res = mockRes();
    await borradorController.eliminar(mockReq({ params: { id: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'No autorizado' });
    expect(mockPrisma.borrador.delete).not.toHaveBeenCalled();
  });

  it('elimina el borrador propio y retorna 200', async () => {
    mockPrisma.borrador.findUnique.mockResolvedValue({ id: 5, usuarioId: 7 });
    mockPrisma.borrador.delete.mockResolvedValue({ id: 5 });

    const res = mockRes();
    await borradorController.eliminar(mockReq({ params: { id: '5' } }), res);

    expect(mockPrisma.borrador.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Borrador eliminado' });
  });

  it('retorna 500 genérico si Prisma lanza error', async () => {
    mockPrisma.borrador.findUnique.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await borradorController.eliminar(mockReq({ params: { id: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});
