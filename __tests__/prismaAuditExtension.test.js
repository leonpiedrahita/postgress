// Mock @prisma/client before requiring the extension
jest.mock('@prisma/client', () => ({
  Prisma: {
    defineExtension: jest.fn((fn) => fn), // devuelve la función tal cual para poder llamarla en tests
  },
}));

const auditExtension = require('../src/middleware/prisma-audit-extension');

/**
 * Construye un cliente mock y ejecuta la función defineExtension
 * para obtener la lógica de $allOperations.
 */
const buildAllOperations = (clientOverrides = {}) => {
  const mockClient = {
    nombre: 'testUser',
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    Usuario: { findUnique: jest.fn() },
    Equipo: { findUnique: jest.fn() },
    ...clientOverrides,
  };

  // auditExtension recibe client y llama client.$extends(...)
  // Capturamos el objeto pasado a $extends
  let capturedExtend;
  mockClient.$extends = jest.fn((obj) => {
    capturedExtend = obj;
    return mockClient;
  });

  // Invocamos la función que defineExtension recibe
  auditExtension(mockClient);

  const allOperationsFn =
    capturedExtend?.query?.$allModels?.$allOperations;

  return { mockClient, allOperations: allOperationsFn };
};

// ─── Modelos excluidos ────────────────────────────────────────────────────────
describe('modelos excluidos (AuditLog)', () => {
  it('no registra auditoría para AuditLog create', async () => {
    const { mockClient, allOperations } = buildAllOperations();
    const query = jest.fn().mockResolvedValue({ id: 1 });

    await allOperations({ model: 'AuditLog', operation: 'create', args: {}, query });

    expect(query).toHaveBeenCalled();
    expect(mockClient.auditLog.create).not.toHaveBeenCalled();
  });
});

// ─── Operaciones de lectura ───────────────────────────────────────────────────
describe('operaciones de lectura (findMany, findUnique, etc.)', () => {
  it('no registra auditoría para findMany', async () => {
    const { mockClient, allOperations } = buildAllOperations();
    const query = jest.fn().mockResolvedValue([]);

    await allOperations({ model: 'Usuario', operation: 'findMany', args: {}, query });

    expect(query).toHaveBeenCalled();
    expect(mockClient.auditLog.create).not.toHaveBeenCalled();
  });

  it('no registra auditoría para findUnique', async () => {
    const { mockClient, allOperations } = buildAllOperations();
    const query = jest.fn().mockResolvedValue(null);

    await allOperations({ model: 'Equipo', operation: 'findUnique', args: {}, query });

    expect(query).toHaveBeenCalled();
    expect(mockClient.auditLog.create).not.toHaveBeenCalled();
  });
});

// ─── create ───────────────────────────────────────────────────────────────────
describe('operación create', () => {
  it('registra auditoría con afterData tras create', async () => {
    const { mockClient, allOperations } = buildAllOperations();
    const created = { id: 42, nombre: 'Nuevo' };
    const query = jest.fn().mockResolvedValue(created);

    await allOperations({
      model: 'Usuario',
      operation: 'create',
      args: { data: { nombre: 'Nuevo' } },
      query,
    });

    expect(mockClient.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          tableName: 'Usuario',
          afterData: created,
          beforeData: null,
        }),
      })
    );
  });
});

// ─── update ───────────────────────────────────────────────────────────────────
describe('operación update', () => {
  it('captura beforeData y registra auditoría tras update', async () => {
    const before = { id: 10, nombre: 'Antes' };
    const after = { id: 10, nombre: 'Después' };

    const { mockClient, allOperations } = buildAllOperations({
      Usuario: { findUnique: jest.fn().mockResolvedValue(before) },
    });
    const query = jest.fn().mockResolvedValue(after);

    await allOperations({
      model: 'Usuario',
      operation: 'update',
      args: { where: { id: 10 }, data: { nombre: 'Después' } },
      query,
    });

    expect(mockClient.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPDATE',
          tableName: 'Usuario',
          beforeData: before,
          afterData: after,
        }),
      })
    );
  });
});

// ─── delete ───────────────────────────────────────────────────────────────────
describe('operación delete', () => {
  it('captura beforeData y no guarda afterData tras delete', async () => {
    const before = { id: 5, nombre: 'AEliminar' };
    const deleted = { id: 5 };

    const { mockClient, allOperations } = buildAllOperations({
      Equipo: { findUnique: jest.fn().mockResolvedValue(before) },
    });
    const query = jest.fn().mockResolvedValue(deleted);

    await allOperations({
      model: 'Equipo',
      operation: 'delete',
      args: { where: { id: 5 } },
      query,
    });

    expect(mockClient.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'DELETE',
          tableName: 'Equipo',
          beforeData: before,
          afterData: null,
        }),
      })
    );
  });
});

// ─── error al registrar auditoría ────────────────────────────────────────────
describe('error al registrar auditoría', () => {
  it('no lanza excepción si auditLog.create falla', async () => {
    const { mockClient, allOperations } = buildAllOperations({
      auditLog: { create: jest.fn().mockRejectedValue(new Error('Audit fail')) },
    });
    const query = jest.fn().mockResolvedValue({ id: 1 });

    await expect(
      allOperations({ model: 'Usuario', operation: 'create', args: {}, query })
    ).resolves.not.toThrow();
  });
});
