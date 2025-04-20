const prisma = require('../src/prisma-client'); // Importa el cliente Prisma configurado

// Listar todos los equipos
exports.listar = async (req, res) => {
  try {
    const equipos = await prisma.refEquipo.findMany();
    res.status(200).json(equipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
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