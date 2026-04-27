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
  verificarAdminCot: verificarRol(['administrador', 'cotizaciones', 'ventas', 'ingresos']),
  verificarAdminCal: verificarRol(['administrador', 'calidad']),
  verificarAdminSopCom: verificarRol(['administrador', 'soporte', 'aplicaciones', 'comercial']),
  verificarAdminCalCot: verificarRol(['administrador', 'cotizaciones', 'ventas', 'ingresos', 'calidad', 'aplicaciones']),
  verificarAdminSopComCot: verificarRol(['administrador', 'soporte', 'aplicaciones', 'comercial', 'cotizaciones', 'ventas', 'ingresos']),
  verificarAdminSopCot: verificarRol(['administrador', 'soporte', 'aplicaciones', 'cotizaciones', 'ventas', 'ingresos']),
  verificarAdminSopCotBodLum: verificarRol(['administrador', 'soporte', 'aplicaciones', 'cotizaciones', 'ventas', 'ingresos', 'bodega', 'lumira']),
  verificarUsuario: verificarRol(['administrador', 'cotizaciones', 'ventas', 'ingresos', 'calidad', 'soporte', 'aplicaciones', 'comercial', 'bodega']),
  verificarUsuarioLum: verificarRol(['administrador', 'cotizaciones', 'ventas', 'ingresos', 'calidad', 'soporte', 'aplicaciones', 'comercial', 'bodega', 'lumira']),
};