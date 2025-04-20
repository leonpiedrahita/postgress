const prisma = require('../src/prisma-client'); // Importa el cliente Prisma con la extensión de auditoría


exports.listar = async (req, res) => {
  try {
    const reportes = await prisma.reporte.findMany();
    res.status(200).json(reportes);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.listaruno = async (req, res) => {
  const id = req.params.id;
  try {
    const reporte = await prisma.reporte.findUnique({
      where: { id: id },
    });

    if (reporte) {
      res.status(200).json(reporte);
    } else {
      res.json("nada");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.registrar = async (req, res,next) => {
  try {
    // Contar solo los registros donde `numero` no sea nulo
    const contador = await prisma.reporte.count({
      where: {
        numero: {
          not: null, // Filtra los registros donde `numero` no es nulo
        },
      },
    });
    const duracion = req.body.reporte.duracion.toString()

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

    console.log(result);
    req.respuesta='Reporte creado'
    req.idcreada = result.id
    next()
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.registrarexterno = async (req, res, next) => {
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

    console.log('Resultado registrar reporte externo', result);

    // Guardar datos en res.locals para el siguiente middleware
    res.locals.respuesta = 'Reporte externo creado';
    res.locals.idcreada = result.id;

    next(); // Continuar con el siguiente middleware
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.actualizar = async (req, res) => {
  const id = req.params.id;
  try {
    const updateOps = req.body;

    const result = await prisma.equipo.update({
      where: { id: id },
      data: updateOps,
    });

    res.status(200).json({
      message: 'Equipo Actualizado',
      articulo: result,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message,
    });
  }
};