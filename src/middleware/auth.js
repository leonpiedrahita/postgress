const tokenServices = require('../../services/token');
const { getPrismaWithUser } = require('../../src/prisma-client'); // importa la función que extiende Prisma

const verificarRol = (rolesPermitidos) => {
  return async (req, res, next) => {
    const token = req.headers.token;

    if (!token) {
      return res.status(404).send({ message: 'Token no encontrado' });
    }

    const validationResponse = await tokenServices.decode(token);

    if (validationResponse === 'token vencido') {
      return res.status(403).send({ message: 'Token vencido' });
    }

    if (!rolesPermitidos.includes(validationResponse.rol)) {
      return res.status(403).send({ message: 'No autorizado' });
    }

    // Inyectar Prisma con userId para logs
    req.prisma = getPrismaWithUser(validationResponse.nombre);

    // Inyectar datos del usuario si lo necesitas más adelante
    req.usuario = {
      id: validationResponse.id,
      nombre: validationResponse.nombre,
      email: validationResponse.email,
      rol: validationResponse.rol,
    };

    next();
  };
};

module.exports = {
  verificarAdmin: verificarRol(['administrador']),
  verificarAdminCot: verificarRol(['administrador', 'cotizaciones']),
  verificarAdminCal: verificarRol(['administrador', 'calidad']),
  verificarAdminSopCom: verificarRol(['administrador', 'soporte', 'comercial']),
  verificarAdminCalCot: verificarRol(['administrador', 'cotizaciones', 'calidad']),
  verificarAdminSopComCot: verificarRol(['administrador', 'soporte', 'comercial', 'cotizaciones']),
  verificarAdminSopCot: verificarRol(['administrador', 'soporte', 'cotizaciones']),
  verificarAdminSopCotBodLum: verificarRol(['administrador', 'soporte', 'cotizaciones','bodega','lumira']),
  verificarUsuario: verificarRol(['administrador', 'cotizaciones', 'calidad', 'soporte', 'comercial','bodega']),
  verificarUsuarioLum: verificarRol(['administrador', 'cotizaciones', 'calidad', 'soporte', 'comercial','bodega','lumira']),
};