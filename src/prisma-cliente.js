const { PrismaClient } = require('@prisma/client');
const auditExtension = require('./middleware/prisma-audit-extension');

// Configuramos el cliente de Prisma con la extensión
const prisma = new PrismaClient().$extends(auditExtension);

module.exports = prisma;