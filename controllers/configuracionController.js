const ROLES_VALIDOS = ['soporte', 'aplicaciones', 'comercial', 'cotizaciones', 'calidad', 'bodega', 'lumira', 'ventas', 'ingresos'];
const TIPOS_VALIDOS = ['ingreso', 'etapa', 'etapa_despachado'];

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const filas = await req.prisma.$queryRaw`
      SELECT rol, tipo_notificacion, habilitado
      FROM configuracion_notificaciones
      ORDER BY rol, tipo_notificacion
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
    await req.prisma.$transaction(
      cambios.map(({ rol, tipoNotificacion, habilitado }) =>
        req.prisma.$executeRaw`
          INSERT INTO configuracion_notificaciones (rol, tipo_notificacion, habilitado)
          VALUES (${rol}, ${tipoNotificacion}, ${habilitado})
          ON CONFLICT (rol, tipo_notificacion) DO UPDATE SET habilitado = ${habilitado}
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
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: `Rol no permitido: ${rol}` });
  }
  if (!TIPOS_VALIDOS.includes(tipoNotificacion)) {
    return res.status(400).json({ error: `Tipo de notificación no válido: ${tipoNotificacion}` });
  }

  try {
    await req.prisma.$executeRaw`
      INSERT INTO configuracion_notificaciones (rol, tipo_notificacion, habilitado)
      VALUES (${rol}, ${tipoNotificacion}, ${habilitado})
      ON CONFLICT (rol, tipo_notificacion) DO UPDATE SET habilitado = ${habilitado}
    `;
    res.status(200).json({ message: 'Configuración actualizada' });
  } catch (err) {
    console.error('Error al actualizar configuración de notificaciones:', err);
    res.status(500).json({ error: err.message });
  }
};
