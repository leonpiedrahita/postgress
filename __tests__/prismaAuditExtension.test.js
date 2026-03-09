// Mock @prisma/client para que defineExtension sea un pass-through
jest.mock('@prisma/client', () => ({
  Prisma: {
    defineExtension: (fn) => fn,
  },
}));

const auditExtension = require('../src/middleware/prisma-audit-extension');

// Crea un cliente mock con el handler de la extensión capturado
const createMockClient = (nombre = 'TestUser') => {
  let capturedHandler = null;

  const auditLog = { create: jest.fn().mockResolvedValue({}) };

  const client = {
    nombre,
    auditLog,
    // Mock de modelo genérico para beforeData en update/delete
    TestModel: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, campo: 'valorAnterior' }),
    },
    $extends: jest.fn((config) => {
      capturedHandler = config.query.$allModels.$allOperations;
      return client;
    }),
    getHandler: () => capturedHandler,
  };

  return client;
};

beforeEach(() => jest.clearAllMocks());

describe('prisma-audit-extension', () => {
  it('registra auditoría en operación create', async () => {
    const client = createMockClient('Ana');
    auditExtension(client); // aplica la extensión y captura el handler
    const handler = client.getHandler();

    const query = jest.fn().mockResolvedValue({ id: 42 });
    await handler({ model: 'Usuario', operation: 'create', args: { data: { nombre: 'Leo' } }, query });

    expect(query).toHaveBeenCalled();
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          tableName: 'Usuario',
          userId: 'Ana',
          recordId: 42,
        }),
      })
    );
  });

  it('captura beforeData en operación update', async () => {
    const client = createMockClient('Leo');
    auditExtension(client);
    const handler = client.getHandler();

    // Simula que el modelo existe para capturar beforeData
    client.Usuario = { findUnique: jest.fn().mockResolvedValue({ id: 5, nombre: 'Antes' }) };

    const query = jest.fn().mockResolvedValue({ id: 5, nombre: 'Después' });
    await handler({
      model: 'Usuario',
      operation: 'update',
      args: { where: { id: 5 }, data: { nombre: 'Después' } },
      query,
    });

    expect(query).toHaveBeenCalled();
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPDATE',
          tableName: 'Usuario',
        }),
      })
    );
  });

  it('registra auditoría en operación delete', async () => {
    const client = createMockClient();
    auditExtension(client);
    const handler = client.getHandler();

    const query = jest.fn().mockResolvedValue({ id: 10 });
    await handler({
      model: 'Equipo',
      operation: 'delete',
      args: { where: { id: 10 } },
      query,
    });

    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'DELETE',
          tableName: 'Equipo',
        }),
      })
    );
  });

  it('NO registra auditoría para operaciones de lectura (findMany, findUnique)', async () => {
    const client = createMockClient();
    auditExtension(client);
    const handler = client.getHandler();

    const query = jest.fn().mockResolvedValue([{ id: 1 }]);
    await handler({ model: 'Usuario', operation: 'findMany', args: {}, query });

    expect(query).toHaveBeenCalled();
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it('NO registra auditoría para el modelo AuditLog (evita recursión)', async () => {
    const client = createMockClient();
    auditExtension(client);
    const handler = client.getHandler();

    const query = jest.fn().mockResolvedValue({ id: 1 });
    await handler({ model: 'AuditLog', operation: 'create', args: {}, query });

    expect(query).toHaveBeenCalled();
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it('usa "anonymous" si el cliente no tiene nombre definido', async () => {
    const client = createMockClient(undefined);
    client.nombre = undefined;
    auditExtension(client);
    const handler = client.getHandler();

    const query = jest.fn().mockResolvedValue({ id: 1 });
    await handler({ model: 'Cliente', operation: 'create', args: {}, query });

    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'anonymous' }),
      })
    );
  });

  it('continúa la operación aunque falle el registro de auditoría', async () => {
    const client = createMockClient();
    client.auditLog.create.mockRejectedValue(new Error('Audit DB error'));
    auditExtension(client);
    const handler = client.getHandler();

    const query = jest.fn().mockResolvedValue({ id: 99 });
    // No debe lanzar error aunque la auditoría falle
    await expect(
      handler({ model: 'Usuario', operation: 'create', args: {}, query })
    ).resolves.toEqual({ id: 99 });
  });
});
