const { getPrismaWithUser } = require('../src/prisma-client');

const prisma = getPrismaWithUser('sistema');

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const filas = await prisma.$queryRaw`
      SELECT rol, tipo_notificacion AS "tipoNotificacion", habilitado
      FROM configuracion_notificaciones
      ORDER BY rol, tipo_notificacion
    `;
    res.status(200).json(filas);
  } catch (err) {
    console.error('Error al obtener configuración de notificaciones:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.actualizarConfiguracion = async (req, res) => {
  const { rol, tipoNotificacion, habilitado } = req.body;

  if (!rol || !tipoNotificacion || typeof habilitado !== 'boolean') {
    return res.status(400).json({ error: 'Campos requeridos: rol, tipoNotificacion, habilitado (boolean)' });
  }

  try {
    await prisma.$executeRaw`
      UPDATE configuracion_notificaciones
      SET habilitado = ${habilitado}
      WHERE rol = ${rol} AND tipo_notificacion = ${tipoNotificacion}
    `;
    res.status(200).json({ message: 'Configuración actualizada' });
  } catch (err) {
    console.error('Error al actualizar configuración de notificaciones:', err);
    res.status(500).json({ error: err.message });
  }
};
