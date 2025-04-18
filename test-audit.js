const prisma = require('./src/prisma-client'); // Ruta al cliente Prisma configurado

(async () => {
  try {
    // Operación de prueba (crear un usuario)
    const newUser = await prisma.usuario.create({
      data: {
        nombre: "Prueba",
        email: "prueba@example.com",
        password: "123456",
        rol: "admin",
      },
    });

    console.log("Nuevo usuario creado:", newUser);

    // Verifica manualmente en la tabla audit_logs
    const logs = await prisma.auditLog.findMany();
    console.log("Registros de auditoría:", logs);
  } catch (err) {
    console.error("Error durante la prueba de auditoría:", err);
  } finally {
    await prisma.$disconnect();
  }
})();