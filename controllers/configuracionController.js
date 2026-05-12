const { getPrismaWithUser } = require('../src/prisma-client');

const prisma = getPrismaWithUser('sistema');

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const filas = await prisma.configuracionNotificacion.findMany({
      select: { rol: true, tipoNotificacion: true, habilitado: true },
      orderBy: [{ rol: 'asc' }, { tipoNotificacion: 'asc' }],
    });
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
        prisma.configuracionNotificacion.upsert({
          where: { rol_tipoNotificacion: { rol, tipoNotificacion } },
          update: { habilitado },
          create: { rol, tipoNotificacion, habilitado },
        })
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
    await prisma.configuracionNotificacion.upsert({
      where: { rol_tipoNotificacion: { rol, tipoNotificacion } },
      update: { habilitado },
      create: { rol, tipoNotificacion, habilitado },
    });
    res.status(200).json({ message: 'Configuración actualizada' });
  } catch (err) {
    console.error('Error al actualizar configuración de notificaciones:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerGlobal = async (req, res) => {
  try {
    const registro = await prisma.configuracionNotificacion.findUnique({
      where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'global' } },
      select: { habilitado: true },
    });
    res.status(200).json({ habilitado: registro ? registro.habilitado : true });
  } catch (err) {
    console.error('Error al obtener toggle global:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.actualizarGlobal = async (req, res) => {
  const { habilitado } = req.body;
  if (typeof habilitado !== 'boolean') {
    return res.status(400).json({ error: 'El campo habilitado debe ser boolean' });
  }
  try {
    await prisma.configuracionNotificacion.upsert({
      where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'global' } },
      update: { habilitado },
      create: { rol: 'sistema', tipoNotificacion: 'global', habilitado },
    });
    res.status(200).json({ message: 'Toggle global actualizado', habilitado });
  } catch (err) {
    console.error('Error al actualizar toggle global:', err);
    res.status(500).json({ error: err.message });
  }
};
