const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Listar todos los ingresos
 */
exports.listarTodosLosIngresos = async (req, res) => {
  try {
    const ingresos = await prisma.ingreso.findMany({
      include: {
        equipo: {
            include: {
              cliente: true, // Incluye información del cliente relacionado
            },
          }, // Incluye información del equipo relacionado
        etapas: true, // Incluir las etapas asociadas a cada ingreso
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos', detalles: err.message });
  }
};

/**
 * Listar ingresos por estado
 */
exports.listarIngresosPorEstado = async (req, res) => {
  try {
    const { estado } = req.params; // Estado enviado como parámetro
    const ingresos = await prisma.ingreso.findMany({
      where: { estado },
      include: {
        equipo: true, // Incluye información del equipo relacionado
        etapas: true, // Incluir las etapas asociadas a cada ingreso
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos por estado', detalles: err.message });
  }
};

/**
 * Listar ingresos por serie de equipo
 */
exports.listarIngresosPorSerieDeEquipo = async (req, res) => {
  try {
    const { serie } = req.params; // Serie enviada como parámetro
    const ingresos = await prisma.ingreso.findMany({
      where: {
        equipo: {
          serie, // Filtro por serie de equipo
        },
      },
      include: {
        equipo: true, // Incluye información del equipo relacionado
        etapas: true, // Incluir las etapas asociadas a cada ingreso
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos por serie de equipo', detalles: err.message });
  }
};

/**
 * Listar ingresos por nombre de cliente
 */
exports.listarIngresosPorNombreDeCliente = async (req, res) => {
  try {
    const { nombreCliente } = req.params; // Nombre del cliente enviado como parámetro
    const ingresos = await prisma.ingreso.findMany({
      where: {
        equipo: {
          cliente: {
            nombre: {
              contains: nombreCliente, // Búsqueda parcial por nombre de cliente
              mode: 'insensitive', // Búsqueda sin distinguir mayúsculas/minúsculas
            },
          },
        },
      },
      include: {
        equipo: {
          include: {
            cliente: true, // Incluye información del cliente relacionado
          },
        },
        etapas: true, // Incluir las etapas asociadas a cada ingreso
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos por nombre de cliente', detalles: err.message });
  }
};
/**
 * Obtener un ingreso por ID junto con el equipo y las etapas relacionadas
 */
exports.obtenerIngresoPorId = async (req, res) => {
    try {
      const { ingresoId } = req.params; // Obtener el ID del ingreso desde los parámetros
  
      // Validar que el ingresoId es un número válido
      if (!ingresoId || isNaN(parseInt(ingresoId))) {
        return res.status(400).json({
          error: 'El parámetro ingresoId es requerido y debe ser un número válido.',
        });
      }
  
      // Buscar el ingreso por ID e incluir el equipo y las etapas relacionadas
      const ingreso = await prisma.ingreso.findUnique({
        where: { id: parseInt(ingresoId) },
        include: {
            equipo: {
                include: {
                  cliente: true, // Incluye información del cliente relacionado
                },
              }, // Incluye información del equipo relacionado
          etapas: true, // Incluir las etapas relacionadas con el ingreso
          
        },
      });
  
      // Verificar si el ingreso existe
      if (!ingreso) {
        return res.status(404).json({
          error: `No se encontró un ingreso con el id ${ingresoId}.`,
        });
      }
  
      // Responder con el ingreso, el equipo y las etapas relacionadas
      res.status(200).json(ingreso);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Ocurrió un error al obtener el ingreso.',
        detalles: err.message,
      });
    }
  };
/**
 * Registrar un nuevo ingreso
 */
exports.registrarIngreso = async (req, res) => {
    try {
      const { equipo, etapa } = req.body;
  
      // Validar que equipo.id y etapa están presentes en el body
      if (!equipo?.id) {
        return res.status(400).json({ error: 'El campo equipo.id es requerido.' });
      }
      if (!etapa) {
        return res.status(400).json({ error: 'El objeto etapa es requerido.' });
      }
  
      // Validar los campos obligatorios de etapa
      const { nombre, responsable, fecha, ubicacion } = etapa;
      if (!(nombre && responsable && fecha && ubicacion)) {
        return res.status(400).json({
          error: 'Los campos nombre, responsable, fecha y ubicacion son requeridos en el objeto etapa.',
        });
      }
  
      // Verificar si el equipo ya tiene un ingreso en estado "Abierta"
      const ingresoAbierto = await prisma.ingreso.findFirst({
        where: {
          equipoId: equipo.id,
          estado: 'Abierta',
        },
      });
  
      if (ingresoAbierto) {
        return res.status(400).json({
          error: `El equipo ya tiene un ingreso en estado "Abierto".`,
        });
      }
  
      // Validar que el equipo existe
      const equipoExistente = await prisma.equipo.findUnique({
        where: { id: equipo.id },
      });
      if (!equipoExistente) {
        return res.status(404).json({ error: `No se encontró un equipo con el id ${equipo.id}.` });
      }
  
      // Crear el ingreso con la etapa inicial
      const nuevoIngreso = await prisma.ingreso.create({
        data: {
          equipoId: equipo.id, // Relacionar al equipo
          estado: 'Abierta', // Estado inicial
          etapaActual: 1, // Etapa actual inicial (int)
          ultimaEtapa: 1, // Última etapa inicial (int)
          etapas: {
            create: [
              {
                nombre, // Almacenar como string
                ubicacion,
              },
            ],
          },
        },
        include: {
          etapas: true, // Incluir las etapas creadas en la respuesta
        },
      });
  
      // Enviar la respuesta con el ingreso creado
      res.status(201).json(nuevoIngreso);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ocurrió un error al registrar el ingreso.', detalles: err.message });
    }
  };

/**
 * Agregar una nueva etapa a un ingreso con estado "Abierta" y actualizar la etapa más reciente.
 */
exports.agregarEtapa = async (req, res) => {
    console.log('parametros', req.params);
    console.log('body', req.body);
    try {
      const { ingresoId } = req.params; // Obtener el ID del ingreso desde los parámetros
      const {
        nombre,
        comentario,
        responsable,
        fecha,
        ubicacion,
        etapaActual,
        ultimaEtapa,
        estado,
      } = req.body; // Obtener los datos de la nueva etapa desde el body
  
      // Validar que el ingresoId es un número válido
      if (!ingresoId || isNaN(parseInt(ingresoId))) {
        return res.status(400).json({ error: 'El parámetro ingresoId es requerido y debe ser un número válido.' });
      }
  
      // Validar que todos los campos requeridos están presentes
      if (!(nombre && responsable && fecha && ubicacion && etapaActual && ultimaEtapa && estado)) {
        return res.status(400).json({
          error: 'Los campos nombre, responsable, fecha, ubicacion, etapaActual, ultimaEtapa y estado son requeridos.',
        });
      }
  
      // Verificar si el ingreso existe y está en estado "Abierta"
      const ingreso = await prisma.ingreso.findUnique({
        where: { id: parseInt(ingresoId) },
        include: {
          etapas: {
            orderBy: {
              createdAt: 'desc', // Ordenar por la fecha de creación (más reciente primero)
            },
            take: 1, // Obtener solo la etapa más reciente
          },
        },
      });
  
      if (!ingreso) {
        return res.status(404).json({ error: `No se encontró un ingreso con el id ${ingresoId}.` });
      }
  
      if (ingreso.estado !== 'Abierta') {
        return res.status(400).json({ error: `El ingreso con id ${ingresoId} no está en estado "Abierta".` });
      }
  
      // Obtener la etapa más reciente
      const etapaMasReciente = ingreso.etapas[0];
      if (etapaMasReciente) {
        // Actualizar la etapa más reciente con los valores de fecha, responsable y comentario
        await prisma.etapa.update({
          where: { id: etapaMasReciente.id },
          data: {
            fecha,
            responsable,
            comentario,
          },
        });
      }
  
      // Agregar la nueva etapa al ingreso con los valores de nombre y ubicación
      const nuevaEtapa = await prisma.etapa.create({
        data: {
          ingresoId: parseInt(ingresoId), // Relacionar con el ingreso
          nombre,
          comentario: null, // La nueva etapa no incluye el comentario (puedes modificar esto según sea necesario)
          responsable: null, // La nueva etapa no incluye el responsable (puedes modificar esto según sea necesario)
          fecha: null, // La nueva etapa no incluye la fecha (puedes modificar esto según sea necesario)
          ubicacion,
        },
      });
  
      // Actualizar los campos etapaActual, ultimaEtapa y estado del ingreso
      const ingresoActualizado = await prisma.ingreso.update({
        where: { id: parseInt(ingresoId) },
        data: {
          etapaActual,
          ultimaEtapa,
          estado,
        },
      });
  
      // Responder con la nueva etapa, la etapa actualizada y el ingreso actualizado
      res.status(201).json({
        message: 'Etapa agregada y etapa más reciente actualizada exitosamente.',
        etapaMasRecienteActualizada: {
          id: etapaMasReciente?.id,
          fecha,
          responsable,
          comentario,
        },
        nuevaEtapa,
        ingresoActualizado,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ocurrió un error al agregar la etapa.', detalles: err.message });
    }
  };