const { getPrismaWithUser } = require('../src/prisma-client');
const sistemaPrisma = getPrismaWithUser('sistema');

exports.obtenerNovedades = async (_req, res) => {
  try {
    const registro = await sistemaPrisma.configuracionNotificacion.findUnique({
      where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'mostrar_novedades' } },
      select: { habilitado: true },
    });
    res.status(200).json({ habilitado: registro ? registro.habilitado : false });
  } catch (err) {
    console.error('Error al obtener config de novedades:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerEtiquetasAlternativas = async (_req, res) => {
  try {
    const registro = await sistemaPrisma.configuracionNotificacion.findUnique({
      where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'etiquetas_alternativas' } },
      select: { habilitado: true },
    });
    res.status(200).json({ habilitado: registro ? registro.habilitado : false });
  } catch (err) {
    console.error('Error al obtener config de etiquetas alternativas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const filas = await req.prisma.configuracionNotificacion.findMany({
      select: { rol: true, tipoNotificacion: true, habilitado: true },
      orderBy: [{ rol: 'asc' }, { tipoNotificacion: 'asc' }],
    });
    res.status(200).json(filas);
  } catch (err) {
    console.error('Error al obtener configuración de notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.guardarConfiguracionBulk = async (req, res) => {
  const { cambios } = req.body;
  if (!Array.isArray(cambios) || !cambios.length) {
    return res.status(400).json({ error: 'Se requiere un array de cambios' });
  }
  try {
    await req.prisma.$transaction(
      cambios.map(({ rol, tipoNotificacion, habilitado }) =>
        req.prisma.configuracionNotificacion.upsert({
          where: { rol_tipoNotificacion: { rol, tipoNotificacion } },
          update: { habilitado },
          create: { rol, tipoNotificacion, habilitado },
        })
      )
    );
    res.status(200).json({ message: 'Configuración guardada', total: cambios.length });
  } catch (err) {
    console.error('Error al guardar configuración bulk:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarConfiguracion = async (req, res) => {
  const { rol, tipoNotificacion, habilitado } = req.body;
  if (!rol || !tipoNotificacion || typeof habilitado !== 'boolean') {
    return res.status(400).json({ error: 'Campos requeridos: rol, tipoNotificacion, habilitado (boolean)' });
  }
  try {
    await req.prisma.configuracionNotificacion.upsert({
      where: { rol_tipoNotificacion: { rol, tipoNotificacion } },
      update: { habilitado },
      create: { rol, tipoNotificacion, habilitado },
    });
    res.status(200).json({ message: 'Configuración actualizada' });
  } catch (err) {
    console.error('Error al actualizar configuración de notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerGlobal = async (req, res) => {
  try {
    const registro = await req.prisma.configuracionNotificacion.findUnique({
      where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'global' } },
      select: { habilitado: true },
    });
    res.status(200).json({ habilitado: registro ? registro.habilitado : true });
  } catch (err) {
    console.error('Error al obtener toggle global:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarGlobal = async (req, res) => {
  const { habilitado } = req.body;
  if (typeof habilitado !== 'boolean') {
    return res.status(400).json({ error: 'El campo habilitado debe ser boolean' });
  }
  try {
    await req.prisma.configuracionNotificacion.upsert({
      where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'global' } },
      update: { habilitado },
      create: { rol: 'sistema', tipoNotificacion: 'global', habilitado },
    });
    res.status(200).json({ message: 'Toggle global actualizado', habilitado });
  } catch (err) {
    console.error('Error al actualizar toggle global:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
