const clienteController = require('../controllers/clienteController');

const mockPrisma = {
  cliente: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  sede: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
  it('retorna 200 con la lista de clientes', async () => {
    const clientes = [{ id: 1, nombre: 'Cliente A' }];
    mockPrisma.cliente.findMany.mockResolvedValue(clientes);

    const res = mockRes();
    await clienteController.listar(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(clientes);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.cliente.findMany.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await clienteController.listar(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── registrar ────────────────────────────────────────────────────────────────
describe('registrar', () => {
  const body = {
    nombre: 'Empresa X', nit: '900123456',
    sedePrincipal: { ciudad: 'Bogotá', direccion: 'Calle 1', activa: true },
  };

  it('crea cliente con sede y retorna 201', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    const clienteCreado = { id: 1, nombre: 'Empresa X', sedes: [{ id: 10 }] };
    mockPrisma.cliente.create.mockResolvedValue(clienteCreado);
    mockPrisma.cliente.update.mockResolvedValue({ ...clienteCreado, sedePrincipalId: 10 });

    const res = mockRes();
    await clienteController.registrar(mockReq({ body }), res);

    expect(mockPrisma.cliente.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 409 si el NIT ya existe', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 5, nit: '900123456' });
    const res = mockRes();
    await clienteController.registrar(mockReq({ body }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockPrisma.cliente.create).not.toHaveBeenCalled();
  });

  it('retorna 400 si falta sedePrincipal', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await clienteController.registrar(mockReq({ body: { nombre: 'X', nit: '123' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si sedePrincipal está incompleta', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await clienteController.registrar(
      mockReq({ body: { nombre: 'X', nit: '123', sedePrincipal: { ciudad: 'Bogotá' } } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.cliente.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await clienteController.registrar(mockReq({ body }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizar ───────────────────────────────────────────────────────────────
describe('actualizar', () => {
  const body = {
    nombre: 'Empresa Y', nit: '900999999',
    sedePrincipal: { ciudad: 'Medellín', direccion: 'Carrera 5', activa: true },
  };

  it('actualiza el cliente y retorna 200', async () => {
    mockPrisma.cliente.findUnique
      .mockResolvedValueOnce({ id: 1, nit: '900000000' }) // cliente existente
      .mockResolvedValueOnce(null);                         // NIT no duplicado
    mockPrisma.sede.create.mockResolvedValue({ id: 20 });
    mockPrisma.cliente.update.mockResolvedValue({ id: 1, ...body });

    const res = mockRes();
    await clienteController.actualizar(mockReq({ params: { id: '1' }, body }), res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 404 si el cliente no existe', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await clienteController.actualizar(mockReq({ params: { id: '999' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 409 si el NIT ya está en uso por otro cliente', async () => {
    mockPrisma.cliente.findUnique
      .mockResolvedValueOnce({ id: 1, nit: '111' }) // cliente existente
      .mockResolvedValueOnce({ id: 2, nit: '900999999' }); // NIT duplicado
    const res = mockRes();
    await clienteController.actualizar(mockReq({ params: { id: '1' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('retorna 400 si falta sedePrincipal', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 1, nit: '111' });
    const res = mockRes();
    await clienteController.actualizar(
      mockReq({ params: { id: '1' }, body: { nombre: 'X', nit: '111' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.cliente.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await clienteController.actualizar(mockReq({ params: { id: '1' }, body }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── agregarsede ──────────────────────────────────────────────────────────────
describe('agregarsede', () => {
  it('agrega una sede y retorna 201', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.sede.create.mockResolvedValue({ id: 30, ciudad: 'Cali' });

    const res = mockRes();
    await clienteController.agregarsede(
      mockReq({ params: { id: '1' }, body: { ciudad: 'Cali', direccion: 'Av 1' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retorna 404 si el cliente no existe', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await clienteController.agregarsede(mockReq({ params: { id: '999' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.cliente.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await clienteController.agregarsede(
      mockReq({ params: { id: '1' }, body: { ciudad: 'Cali', direccion: 'Av 1' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── eliminarsede ─────────────────────────────────────────────────────────────
describe('eliminarsede', () => {
  it('desactiva la sede y retorna 200', async () => {
    mockPrisma.sede.findUnique.mockResolvedValue({ id: 5 });
    mockPrisma.sede.update.mockResolvedValue({ id: 5, activa: false });

    const res = mockRes();
    await clienteController.eliminarsede(mockReq({ body: { sedeId: 5 } }), res);

    expect(mockPrisma.sede.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activa: false } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 404 si la sede no existe', async () => {
    mockPrisma.sede.findUnique.mockResolvedValue(null);
    const res = mockRes();
    await clienteController.eliminarsede(mockReq({ body: { sedeId: 999 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.sede.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await clienteController.eliminarsede(mockReq({ body: { sedeId: 5 } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── caminos error 500 ────────────────────────────────────────────────────────
describe('registrar — error 500', () => {
  it('retorna 500 si Prisma lanza error al crear', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    mockPrisma.cliente.create.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await clienteController.registrar(
      mockReq({ body: { nombre: 'X', nit: '999', sedePrincipal: { ciudad: 'Bogotá', direccion: 'Calle 1' } } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('actualizar — error 500', () => {
  it('retorna 500 si Prisma lanza error al actualizar', async () => {
    mockPrisma.cliente.findUnique
      .mockResolvedValueOnce({ id: 1, nit: '111' })
      .mockResolvedValueOnce(null);
    mockPrisma.sede.create.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await clienteController.actualizar(
      mockReq({
        params: { id: '1' },
        body: { nombre: 'Y', nit: '222', sedePrincipal: { ciudad: 'Cali', direccion: 'Av 1' } },
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('agregarsede — error 500', () => {
  it('retorna 500 si Prisma lanza error al crear sede', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.sede.create.mockRejectedValue(new Error('DB error'));

    const res = mockRes();
    await clienteController.agregarsede(
      mockReq({ params: { id: '1' }, body: { ciudad: 'Cali', direccion: 'Av 1' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listaruno ────────────────────────────────────────────────────────────────
describe('listaruno', () => {
  it('retorna 200 con el cliente encontrado', async () => {
    const cliente = { id: 1, nombre: 'Hospital Central', sedes: [], sedePrincipal: null };
    mockPrisma.cliente.findUnique.mockResolvedValue(cliente);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();
    await clienteController.listaruno(req, res);

    expect(mockPrisma.cliente.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(cliente);
  });

  it('retorna 404 si el cliente no existe', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null);
    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();
    await clienteController.listaruno(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.cliente.findUnique.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await clienteController.listaruno(mockReq({ params: { id: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── actualizarsede ───────────────────────────────────────────────────────────
describe('actualizarsede', () => {
  it('actualiza la sede y retorna 200', async () => {
    const sede = { id: 2, ciudad: 'Cali', direccion: 'Cra 5', activa: true, clienteId: 1 };
    mockPrisma.sede.findUnique.mockResolvedValue(sede);
    mockPrisma.sede.update.mockResolvedValue({ ...sede, ciudad: 'Medellín' });

    const req = mockReq({ params: { sedeId: '2' }, body: { ciudad: 'Medellín' } });
    const res = mockRes();
    await clienteController.actualizarsede(req, res);

    expect(mockPrisma.sede.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('retorna 404 si la sede no existe', async () => {
    mockPrisma.sede.findUnique.mockResolvedValue(null);
    const req = mockReq({ params: { sedeId: '999' }, body: { ciudad: 'Cali' } });
    const res = mockRes();
    await clienteController.actualizarsede(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.sede.update).not.toHaveBeenCalled();
  });

  it('solo actualiza los campos enviados en el body', async () => {
    mockPrisma.sede.findUnique.mockResolvedValue({ id: 3, ciudad: 'Bogotá', direccion: 'Cll 1' });
    mockPrisma.sede.update.mockResolvedValue({ id: 3, ciudad: 'Bogotá', direccion: 'Av 80' });

    const req = mockReq({ params: { sedeId: '3' }, body: { direccion: 'Av 80' } });
    const res = mockRes();
    await clienteController.actualizarsede(req, res);

    const callArg = mockPrisma.sede.update.mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty('ciudad'); // ciudad no enviado → no debe actualizarse
    expect(callArg.data).toHaveProperty('direccion', 'Av 80');
  });

  it('retorna 500 si Prisma lanza error', async () => {
    mockPrisma.sede.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.sede.update.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await clienteController.actualizarsede(mockReq({ params: { sedeId: '1' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
