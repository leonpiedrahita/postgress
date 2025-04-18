const { Prisma } = require('@prisma/client');

const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Ejecutar la consulta principal
          const result = await query(args);

          // Registrar solo operaciones de escritura
          if (['create', 'update', 'delete'].includes(operation)) {
            const beforeData =
              operation === 'update' || operation === 'delete'
                ? await client[model].findUnique({ where: args.where })
                : null;

            const afterData =
              operation === 'create' || operation === 'update'
                ? args.data
                : null;

            // Insertar el log de auditoría
            await client.auditLog.create({
              data: {
                userId: client.userId || 'anonymous', // Reemplázalo con la lógica para obtener el usuario actual
                action: operation.toUpperCase(),
                tableName: model,
                recordId: args.where?.id || null,
                beforeData,
                afterData,
              },
            });
          }

          return result;
        },
      },
    },
  });
});

module.exports = auditExtension;