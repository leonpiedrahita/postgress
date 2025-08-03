// middlewares/attachPrisma.js
const tokenService = require('../../services/token');
const { getPrismaWithUser } = require('../prisma-client');

const attachPrisma = async (req, res, next) => {
  try {
    const token = req.headers.token;
    if (!token) throw new Error('Token no proporcionado');

    const decoded = await tokenService.decode(token);
    if (!decoded?.nombre) throw new Error('Token inválido o sin nombre');

    req.prisma = getPrismaWithUser(decoded.nombre);
    next();
  } catch (err) {
    console.warn('attachPrisma:', err.message);
    req.prisma = null; // para rutas que pueden manejarse sin prisma (ej. login)
    next();
  }
};

module.exports = attachPrisma;