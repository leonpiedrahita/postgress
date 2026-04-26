const { getPrismaWithUser } = require('../src/prisma-client');

const prisma = getPrismaWithUser('sistema');

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const filas = await prisma.$queryRaw`
      SELECT rol, "tipoNotificacion", habilitado
      FROM configuracion_notificaciones
      ORDER BY rol, "tipoNotificacion"
    `;
    res.status(200).json(filas);
  } catch (err) {
    console.error('Error al obtener configuración de notificaciones:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.guardarConfiguracionBulk = async (req, res) => {
  const { cambios } = req.body;
  if (!Array.isArray(cambios) || !cambios.length) {
    return res.status(400).json({ error: 'Se requiere un array de cambios' });
  }
  try {
    await prisma.$transaction(
      cambios.map(({ rol, tipoNotificacion, habilitado }) =>
        prisma.$executeRaw`
          INSERT INTO configuracion_notificaciones (rol, "tipoNotificacion", habilitado)
          VALUES (${rol}, ${tipoNotificacion}, ${habilitado})
          ON CONFLICT (rol, "tipoNotificacion") DO UPDATE SET habilitado = ${habilitado}
        `
      )
    );
    res.status(200).json({ message: 'Configuración guardada', total: cambios.length });
  } catch (err) {
    console.error('Error al guardar configuración bulk:', err);
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
      INSERT INTO configuracion_notificaciones (rol, "tipoNotificacion", habilitado)
      VALUES (${rol}, ${tipoNotificacion}, ${habilitado})
      ON CONFLICT (rol, "tipoNotificacion") DO UPDATE SET habilitado = ${habilitado}
    `;
    res.status(200).json({ message: 'Configuración actualizada' });
  } catch (err) {
    console.error('Error al actualizar configuración de notificaciones:', err);
    res.status(500).json({ error: err.message });
  }
};
