

const { parsePaginacion } = require('../src/utils/paginacion');

// Soporta paginación opcional con ?page=1&limit=50 (responde { data, total, page, limit }).
exports.listar = async (req, res) => {
  const prisma = req.prisma;

  const paginacion = parsePaginacion(req.query);
  if (paginacion?.error) {
    return res.status(400).json({ error: 'Parámetros de paginación inválidos' });
  }

  try {
    if (paginacion) {
      const [data, total] = await Promise.all([
        prisma.reporte.findMany({
          orderBy: { id: 'desc' },
          skip: paginacion.skip,
          take: paginacion.take,
        }),
        prisma.reporte.count(),
      ]);
      return res.status(200).json({ data, total, page: paginacion.page, limit: paginacion.limit });
    }

    const reportes = await prisma.reporte.findMany();
    res.status(200).json(reportes);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};

exports.listaruno = async (req, res) => {
  const prisma = req.prisma;
  // El id de Reporte es un CUID (string), no un entero.
  const id = req.params.id;
  if (typeof id !== 'string' || !/^[a-z0-9-]{10,40}$/i.test(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  try {
    const reporte = await prisma.reporte.findUnique({
      where: { id },
    });

    if (reporte) {
      res.status(200).json(reporte);
    } else {
      res.status(404).json({ error: 'Reporte no encontrado' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};

exports.registrar = async (req, res,next) => {
  const prisma = req.prisma;
  try {
    // Contar solo los registros donde `numero` no sea nulo
    const contador = await prisma.reporte.count({
      where: {
        numero: {
          not: null, // Filtra los registros donde `numero` no es nulo
        },
      },
    });
    const duracion = req.body.reporte.duracion != null ? String(req.body.reporte.duracion) : ''

    const nuevoReporte = {
      numero: contador + 1,
      tipodeasistencia: req.body.reporte.tipodeasistencia,
      duracion: duracion,
      fechadeinicio: req.body.reporte.fechadeinicio,
      fechadefinalizacion: req.body.reporte.fechadefinalizacion,
      infoequipo: req.body.reporte.infoequipo,
      propietario: req.body.reporte.propietario,
      nombrecliente: req.body.reporte.nombrecliente,
      nitcliente: req.body.reporte.nitcliente,
      sedecliente: req.body.reporte.sedecliente,
      direccioncliente: req.body.reporte.direccioncliente,
      profesionalcliente: req.body.reporte.profesionalcliente,
      telefonocliente: req.body.reporte.telefonocliente,
      hallazgos: req.body.reporte.hallazgos,
      actividades: req.body.reporte.actividades,
      pruebas: req.body.reporte.pruebas,
      repuestos: req.body.reporte.repuestos,
      observaciones: req.body.reporte.observaciones,
      firmacliente: req.body.reporte.firmacliente,
      firmaingeniero: req.body.reporte.firmaingeniero,
      ingeniero: req.body.reporte.ingeniero,
      reporteexterno: 0,
    };

    const result = await prisma.reporte.create({
      data: nuevoReporte,
    });

    // console.log(result);
    req.respuesta='Reporte creado'
    req.idcreada = result.id
    next()
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};

exports.registrarexterno = async (req, res, next) => {
  const prisma = req.prisma;
  try {
    const reporteexterno = JSON.parse(req.body.reporte);
    const nuevoReporte = {
      tipodeasistencia: reporteexterno.tipodeasistencia,
      fechadeinicio: reporteexterno.fechadeinicio,
      fechadefinalizacion: reporteexterno.fechadefinalizacion,
      infoequipo: reporteexterno.infoequipo,
      propietario: reporteexterno.propietario,
      nombrecliente: reporteexterno.nombrecliente,
      nitcliente: reporteexterno.nitcliente,
      sedecliente: reporteexterno.sedecliente,
      direccioncliente: reporteexterno.direccioncliente,
      ingeniero: reporteexterno.ingeniero,
      reporteexterno: 1,
      llavereporte: res.locals.llave,
    };

    const result = await prisma.reporte.create({
      data: nuevoReporte,
    });

    // console.log('Resultado registrar reporte externo', result);

    // Guardar datos en res.locals para el siguiente middleware
    res.locals.respuesta = 'Reporte externo creado';
    res.locals.idcreada = result.id;

    next(); // Continuar con el siguiente middleware
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizar = async (req, res) => {
  const prisma = req.prisma;
  // El id de Reporte es un CUID (string), no un entero.
  const id = req.params.id;
  if (typeof id !== 'string' || !/^[a-z0-9-]{10,40}$/i.test(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  try {
    // req.body ya viene filtrado por validate(actualizarSchema) — solo campos de reporte
    const updateOps = req.body;

    const result = await prisma.reporte.update({
      where: { id },
      data: updateOps,
    });

    res.status(200).json({
      message: 'Reporte actualizado',
      reporte: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};
exports.listarPorEquipo = async (req, res) => {
  const prisma = req.prisma;
  try {
    const equipoId = parseInt(req.params.equipoId);
    const historial = await prisma.historialServicio.findMany({
      where: { equipoId },
      include: {
        reporte: true,
        responsable: { select: { nombre: true, rol: true } },
        documentosSoporte: { where: { eliminado: false } },
      },
      orderBy: { fecha: 'desc' },
    });
    res.status(200).json(historial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crearDocumentoSoporte = async (req, res) => {
  const prisma = req.prisma;
  try {
    const nombredocumento = JSON.parse(req.body.nombredocumento);
    const nuevoDocumento = await prisma.documentoSoporte.create({
      data: {
        nombreDocumento: nombredocumento,
        llaveDocumento: res.locals.llave,
        fecha: new Date(),
        historialServicio: {
          connect: { id: parseInt(req.body.id_servicio) }
        }
      }
    });

    res.status(201).json(nuevoDocumento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar el documento soporte" });
  }
};