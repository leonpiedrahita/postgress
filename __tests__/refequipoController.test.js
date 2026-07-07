const refequipoController = require('../controllers/refequipoController');

const mockPrisma = {
  refEquipo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  documentoLegal: {
    create: jest.fn(),
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

beforeEach(() => jest.clearAllMocks());

// ─── listar ───────────────────────────────────────────────────────────────────
describe('listar', () => {
  it('retorna 200 con la lista de referencias', async () => {
    const equipos = [{ id: 1, nombre: 'Analizador', marca: 'Snibe', documentosLegales: [] }];
    mockPrisma.refEquipo.findMany.mockResolvedValue(equipos);

    const res = mockRes();
    await refequipoController.listar(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(equipos);
  });

  it('retorna 500 con mensaje genérico si Prisma lanza error (sin filtrar err.message)', async () => {
    mockPrisma.refEquipo.findMany.mockRejectedValue(new Error('secreto interno de la BD'));

    const res = mockRes();
    await refequipoController.listar(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Ocurrió un error al listar los equipos.' });
    const respuesta = JSON.stringify(res.json.mock.calls[0][0]);
    expect(respuesta).not.toContain('secreto interno de la BD');
  });
});

// ─── listaruno ────────────────────────────────────────────────────────────────
describe('listaruno', () => {
  it('retorna 200 con la referencia encontrada', async () => {
    const equipo = { id: 3, nombre: 'Monitor', marca: 'GE', documentosLegales: [] };
    mockPrisma.refEquipo.findUnique.mockResolvedValue(equipo);

    const res = mockRes();
    await refequipoController.listaruno(mockReq({ params: { id: '3' } }), res);

    expect(mockPrisma.refEquipo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(equipo);
  });

  it('retorna 404 si la referencia no existe', async () => {
    mockPrisma.refEquipo.findUnique.mockResolvedValue(null);

    const res = mockRes();
    await refequipoController.listaruno(mockReq({ params: { id: '999' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Equipo no encontrado' });
  });

  it('retorna 500 con mensaje genérico si Prisma lanza error', async () => {
    mockPrisma.refEquipo.findUnique.mockRejectedValue(new Error('detalle sensible'));

    const res = mockRes();
    await refequipoController.listaruno(mockReq({ params: { id: '1' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});

// ─── actualizar — validación de ID ────────────────────────────────────────────
describe('actualizar — validación de ID', () => {
  const idsInvalidos = ['abc', '0', '-5'];

  idsInvalidos.forEach(id => {
    it(`retorna 400 con id inválido "${id}" sin tocar la BD`, async () => {
      const res = mockRes();
      await refequipoController.actualizar(
        mockReq({ params: { id }, body: { nombre: 'X' } }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID inválido' });
      expect(mockPrisma.refEquipo.update).not.toHaveBeenCalled();
    });
  });

  it('retorna 400 si no se envía id', async () => {
    const res = mockRes();
    await refequipoController.actualizar(mockReq({ params: {}, body: { nombre: 'X' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.refEquipo.update).not.toHaveBeenCalled();
  });
});

// ─── actualizar — whitelist anti mass-assignment ──────────────────────────────
describe('actualizar — whitelist de campos', () => {
  it('ignora campos maliciosos extra (id, createdAt, hacked) y solo pasa la whitelist', async () => {
    mockPrisma.refEquipo.update.mockResolvedValue({ id: 1, nombre: 'Nuevo' });

    const bodyMalicioso = {
      nombre: 'Nuevo',
      marca: 'Snibe',
      id: 999,
      createdAt: '1970-01-01',
      hacked: true,
      documentosLegales: { deleteMany: {} },
    };
    const res = mockRes();
    await refequipoController.actualizar(
      mockReq({ params: { id: '1' }, body: bodyMalicioso }),
      res
    );

    // data debe contener EXACTAMENTE los campos whitelisted enviados
    expect(mockPrisma.refEquipo.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nombre: 'Nuevo', marca: 'Snibe' },
    });
    const dataEnviada = mockPrisma.refEquipo.update.mock.calls[0][0].data;
    expect(dataEnviada).not.toHaveProperty('id');
    expect(dataEnviada).not.toHaveProperty('createdAt');
    expect(dataEnviada).not.toHaveProperty('hacked');
    expect(dataEnviada).not.toHaveProperty('documentosLegales');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('actualización parcial solo pasa los campos enviados en el body', async () => {
    mockPrisma.refEquipo.update.mockResolvedValue({ id: 2, peso: '10kg' });

    const res = mockRes();
    await refequipoController.actualizar(
      mockReq({ params: { id: '2' }, body: { peso: '10kg', voltaje: '110V' } }),
      res
    );

    expect(mockPrisma.refEquipo.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { peso: '10kg', voltaje: '110V' },
    });
  });

  it('retorna 200 con formato { message, equipo } al actualizar', async () => {
    const actualizado = { id: 1, nombre: 'Analizador v2' };
    mockPrisma.refEquipo.update.mockResolvedValue(actualizado);

    const res = mockRes();
    await refequipoController.actualizar(
      mockReq({ params: { id: '1' }, body: { nombre: 'Analizador v2' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Equipo actualizado', equipo: actualizado });
  });

  it('body con solo campos no permitidos produce update con data vacío (no filtra nada extra)', async () => {
    mockPrisma.refEquipo.update.mockResolvedValue({ id: 4 });

    const res = mockRes();
    await refequipoController.actualizar(
      mockReq({ params: { id: '4' }, body: { rol: 'administrador', eliminado: true } }),
      res
    );

    expect(mockPrisma.refEquipo.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: {},
    });
  });
});

// ─── actualizar — errores ─────────────────────────────────────────────────────
describe('actualizar — error 500', () => {
  it('retorna 500 con mensaje genérico sin exponer err.message', async () => {
    mockPrisma.refEquipo.update.mockRejectedValue(new Error('P2025: record not found — tabla interna'));

    const res = mockRes();
    await refequipoController.actualizar(
      mockReq({ params: { id: '1' }, body: { nombre: 'X' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    const respuesta = JSON.stringify(res.json.mock.calls[0][0]);
    expect(respuesta).not.toContain('P2025');
  });
});
