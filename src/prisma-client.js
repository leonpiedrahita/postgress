const { PrismaClient } = require('@prisma/client');
const auditExtension = require('./middleware/prisma-audit-extension');

const prismaBase = new PrismaClient();

// Cliente anónimo (sin usuario, por ejemplo para login o registros sin token)
const prisma = prismaBase.$extends(auditExtension);

// Cliente personalizado (cuando ya tienes el usuario)
const getPrismaWithUser = (nombreUsuario) => {
  return prismaBase
    .$extends({
      client: {
        nombre: nombreUsuario,
      },
    })
    .$extends(auditExtension);
};

module.exports = {
  prisma, // usar en controladores donde aún no hay token
  getPrismaWithUser, // usar donde ya tienes el nombre de usuario
};