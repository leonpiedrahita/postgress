
// Listar todos los equipos
exports.listar = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
  try {
    // Obtener todos los refEquipos incluyendo los documentos legales relacionados
    const equipos = await prisma.refEquipo.findMany({
      include: {
        documentosLegales: { where: { eliminado: false } }, // Excluye documentos eliminados (soft delete)
      },
    });

    // Responder con la lista de equipos y sus documentos legales
    res.status(200).json(equipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los equipos.' });
  }
};

exports.listaruno = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
  try {
    const id = parseInt(req.params.id);

    const equipo = await prisma.refEquipo.findUnique({
      where: { id },
      include: {
        documentosLegales: { where: { eliminado: false } }, // Excluye documentos eliminados (soft delete)
      },
    });

    if (!equipo) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    res.status(200).json(equipo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
// Registrar un nuevo equipo
exports.registrar = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
  try {
    // Verifica si ya existe una referencia con el mismo nombre y marca
    const equipoExistente = await prisma.refEquipo.findUnique({
      where: { nombre_marca: { nombre: req.body.nombre, marca: req.body.marca } },
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
      error: 'Error interno del servidor',
    });
  }
};

// Campos permitidos para crear/actualizar una referencia de equipo (whitelist anti mass-assignment)
const CAMPOS_REFEQUIPO = [
  'nombre', 'marca', 'fabricante', 'servicio', 'clasificacionriesgo',
  'periodicidadmantenimiento', 'alto', 'ancho', 'profundo', 'peso',
  'voltaje', 'corriente', 'potencia', 'principiodemedicion', 'pruebasporhora',
  'temperatura', 'humedad', 'agua', 'desague', 'recomendaciones',
];

// Actualizar un equipo
exports.actualizar = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Solo se actualizan los campos de la whitelist enviados en el cuerpo
    const data = {};
    for (const campo of CAMPOS_REFEQUIPO) {
      if (req.body[campo] !== undefined) data[campo] = req.body[campo];
    }

    const equipoActualizado = await prisma.refEquipo.update({
      where: { id },
      data,
    });

    res.status(200).json({
      message: 'Equipo actualizado',
      equipo: equipoActualizado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error interno del servidor',
    });
  }
};
exports.registrardocumento = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};