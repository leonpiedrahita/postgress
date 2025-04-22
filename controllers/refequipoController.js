const prisma = require('../src/prisma-client'); // Importa el cliente Prisma configurado

// Listar todos los equipos
exports.listar = async (req, res) => {
  try {
    // Obtener todos los refEquipos incluyendo los documentos legales relacionados
    const equipos = await prisma.refEquipo.findMany({
      include: {
        documentosLegales: true, // Incluir los documentos legales relacionados
      },
    });

    // Responder con la lista de equipos y sus documentos legales
    res.status(200).json(equipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los equipos.', detalles: err.message });
  }
};

exports.listaruno = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const equipo = await prisma.refEquipo.findUnique({
      where: { id },
      include: {
        documentosLegales: true, // Incluye los documentos legales
      },
    });

    if (!equipo) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    res.status(200).json(equipo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
// Registrar un nuevo equipo
exports.registrar = async (req, res) => {
  try {
    // Verifica si el equipo ya existe con el mismo nombre
    const equipoExistente = await prisma.refEquipo.findUnique({
      where: { nombre: req.body.nombre },
    });

    if (equipoExistente) {
      return res.status(409).json({
        message: 'Equipo existente',
      });
    }

    // Crea un nuevo equipo
    const nuevoEquipo = await prisma.refEquipo.create({
      data: {
        nombre: req.body.nombre,
        marca: req.body.marca,
        fabricante: req.body.fabricante,
        servicio: req.body.servicio,
        clasificacionriesgo: req.body.clasificacionriesgo,
        periodicidadmantenimiento: req.body.periodicidadmantenimiento,
        alto: req.body.alto,
        ancho: req.body.ancho,
        profundo: req.body.profundo,
        peso: req.body.peso,
        voltaje: req.body.voltaje,
        corriente: req.body.corriente,
        potencia: req.body.potencia,
        principiodemedicion: req.body.principiodemedicion,
        pruebasporhora: req.body.pruebasporhora,
        temperatura: req.body.temperatura,
        humedad: req.body.humedad,
        agua: req.body.agua,
        desague: req.body.desague,
        recomendaciones: req.body.recomendaciones,
      },
    });

    res.status(201).json({
      message: 'Equipo creado',
      equipo: nuevoEquipo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err,
    });
  }
};

// Actualizar un equipo
exports.actualizar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Actualizar equipo con los campos enviados en el cuerpo de la solicitud
    const equipoActualizado = await prisma.refEquipo.update({
      where: { id },
      data: req.body, // Actualiza dinámicamente los campos enviados
    });

    res.status(200).json({
      message: 'Equipo actualizado',
      equipo: equipoActualizado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err,
    });
  }
};
exports.registrardocumento = async (req, res) => {
  console.log('req.body', req.body);
  console.log('req.file', req.file);    
  console.log('res.locals.llave', res.locals.llave);
  try {
    const id = parseInt(req.body.id_equipo);
    const nombredocumento = JSON.parse(req.body.nombredocumento);
    const nuevoDocumento = {
      nombreDocumento: nombredocumento,
      llaveDocumento: res.locals.llave,
      fecha: new Date(),
    };

    await prisma.documentoLegal.create({
      data: { ...nuevoDocumento, refEquipoId: id },
    });

    res.status(201).json({ message: 'Documento registrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};