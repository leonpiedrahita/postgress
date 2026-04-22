const { getPrismaWithUser } = require('../src/prisma-client');

/**
 * Resumen de KPIs del sistema para el dashboard.
 * GET /api/estadisticas/resumen
 */
exports.resumen = async (req, res) => {
  const prisma = req.prisma;
  try {
    const hoy = new Date();
    const hace30Dias = new Date(hoy);
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const [
      totalEquipos,
      totalClientes,
      ingresosAbiertos,
      ingresosCerrados,
      ingresosUltimos30Dias,
      equiposPorEstado,
    ] = await Promise.all([
      prisma.equipo.count(),
      prisma.cliente.count(),
      prisma.ingreso.count({ where: { estado: 'Abierto' } }),
      prisma.ingreso.count({ where: { estado: 'Cerrado' } }),
      prisma.ingreso.count({ where: { createdAt: { gte: hace30Dias } } }),
      prisma.equipo.groupBy({ by: ['estado'], _count: { id: true } }),
    ]);

    res.status(200).json({
      equipos: {
        total: totalEquipos,
        porEstado: Object.fromEntries(equiposPorEstado.map(e => [e.estado || 'Sin estado', e._count.id])),
      },
      clientes: { total: totalClientes },
      ingresos: {
        abiertos: ingresosAbiertos,
        cerrados: ingresosCerrados,
        ultimos30Dias: ingresosUltimos30Dias,
      },
    });
  } catch (err) {
    console.error('[Estadísticas] Error en resumen:', err.message);
    res.status(500).json({ error: err.message });
  }
};
