const { Prisma } = require('@prisma/client');

// Lista de tablas que no deben ser auditadas
const MODELOS_EXCLUIDOS = ['AuditLog'];

const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Saltar si el modelo está excluido o si es solo una consulta
          if (MODELOS_EXCLUIDOS.includes(model) || !['create', 'update', 'delete'].includes(operation)) {
            return query(args);
          }

          let beforeData = null;

          // Captura de datos previos si es update o delete
          if (['update', 'delete'].includes(operation)) {
            try {
              beforeData = await client[model].findUnique({
                where: args.where,
              });
            } catch {
              // Ignorar error si no se puede capturar beforeData
            }
          }

          // Ejecutar operación
          const result = await query(args);

          // Captura de datos posteriores si es create o update
          let afterData = null;
          if (['create', 'update'].includes(operation)) {
            afterData = result;
          }

          // Registrar en la tabla de auditoría
          try {
            await client.auditLog.create({
              data: {
                userId: client.nombre || 'anonymous',
                action: operation.toUpperCase(),
                tableName: model,
                recordId: result?.id || args.where?.id || null,
                beforeData,
                afterData,
              },
            });
          } catch (err) {
            console.warn('Error al registrar auditoría:', err.message);
          }

          return result;
        },
      },
    },
  });
});

module.exports = auditExtension;
