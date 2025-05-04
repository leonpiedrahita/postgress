const prisma = require('../src/prisma-client'); // Importa el cliente Prisma configurado
const tokenServices = require('../services/token'); // Importa el servicio de tokens

// Listar todos los equipos
exports.listar = async (req, res) => {
  try {
    const equipos = await prisma.equipo.findMany({
      include: {
        propietario: true, // Incluye información del propietario
        cliente: true, // Incluye información del cliente
        referencia: true, // Incluye información de la referencia
        historialDeServicios: true, // Incluye el historial de servicios
        documentosLegales: true, // Incluye documentos legales
      },
    });
    res.status(200).json(equipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar un nuevo equipo
exports.registrar = async (req, res) => {
  try {
    const validationResponse = await tokenServices.decode(req.headers.token);

    const equipoExistente = await prisma.equipo.findUnique({
      where: { serie: req.body.nuevoequipo.serie },
    });

    if (equipoExistente) {
      return res.status(409).json({ message: 'Equipo existente' });
    }

    const nuevoEquipo = await prisma.equipo.create({
      data: {
        nombre: req.body.nuevoequipo.nombre,
        marca: req.body.nuevoequipo.marca,
        serie: req.body.nuevoequipo.serie,
        idReferencia: req.body.nuevoequipo.id,
        propietarioId: req.body.nuevoequipo.propietario.id,
        clienteId: req.body.nuevoequipo.cliente.id,
        ubicacionNombre: req.body.nuevoequipo.ubicacion.nombre,
        ubicacionDireccion: req.body.nuevoequipo.ubicacion.direccion,
        estado: 'Activo',
        placaDeInventario: req.body.nuevoequipo.placaDeInventario,
        tipoDeContrato: req.body.nuevoequipo.tipoDeContrato,
        historialPropietarios: [{
          clienteId: req.body.nuevoequipo.cliente.id,
          propietarioId: req.body.nuevoequipo.propietario.id,
          ubicacionNombre: req.body.nuevoequipo.ubicacion.nombre,
          ubicacionDireccion: req.body.nuevoequipo.ubicacion.direccion,
          responsableId: validationResponse.id,
          fecha: new Date(),
        }],
      },
    });

    res.status(201).json({ message: 'Equipo creado', equipo: nuevoEquipo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar un equipo
exports.actualizar = async (req, res) => {
  console.log('body', req.body);
  console.log('id', req.params.id);
  try {
    const validationResponse = await tokenServices.decode(req.headers.token);
    const id = parseInt(req.params.id); // Convierte el ID a número entero

    // Obtén los valores del cuerpo de la solicitud
    const {

      ubicacionNombre,
      ubicacionDireccion,
      cliente,
      propietario,
      placaDeInventario,
      tipoDeContrato
    } = req.body;

    // Verifica que todos los campos obligatorios estén presentes
    if (!placaDeInventario || !tipoDeContrato || !ubicacionNombre || !ubicacionDireccion || !cliente || !propietario) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Obtén el equipo actual para acceder al historial existente
    const equipoActual = await prisma.equipo.findUnique({
      where: { id },
      select: {
        historialPropietarios: true, // Obtén solo el campo historialPropietarios
      },
    });

    if (!equipoActual) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    // Verifica si historialPropietarios es un array y agrega el nuevo objeto
    const historialActualizado = Array.isArray(equipoActual.historialPropietarios)
      ? [...equipoActual.historialPropietarios]
      : []; // Inicializa como un array vacío si no es un array
    historialActualizado.push({
      clienteId: cliente.id,
      propietarioId: propietario.id,
      ubicacionNombre,
      ubicacionDireccion,
      responsableId: validationResponse.id,
      fecha: new Date(),
    });

    // Actualiza los campos del equipo y el historial de propietarios
    const updatedEquipo = await prisma.equipo.update({
      where: { id },
      data: {
        // Actualiza la marca
        ubicacionNombre, // Actualiza la ubicación
        ubicacionDireccion, // Actualiza la dirección
        placaDeInventario, // Actualiza la placa de inventario
        tipoDeContrato, // Actualiza el tipo de contrato
        cliente: { connect: { id: cliente.id } }, // Conecta al cliente por ID
        propietario: { connect: { id: propietario.id } }, // Conecta al propietario por ID
        historialPropietarios: historialActualizado, // Reemplaza con el historial actualizado
      },
    });

    // Responde con el equipo actualizado
    res.status(200).json({ message: "Equipo actualizado", equipo: updatedEquipo });
  } catch (err) {
    // Captura y maneja errores
    console.error("Error al actualizar el equipo:", err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar un reporte
exports.registrarreporte = async (req, res) => {
  try {
    const validationResponse = await tokenServices.decode(req.headers.token);
    const id = parseInt(req.body.id_equipo);
console.log('validationResponse',validationResponse)
    const nuevoHistorial = {
      identificacionDeReporte: req.idcreada,
      fechaDeFinalizacion: req.body.reporte.fechadefinalizacion,
      tipoDeAsistencia: req.body.reporte.tipodeasistencia,
      responsableId: validationResponse.id,
      reporteExterno: 0,
      fecha: new Date(),
    };

    await prisma.historialServicio.create({
      data: { ...nuevoHistorial, equipoId: id },
    });

    res.status(201).json({ message: 'Reporte registrado',identificacion: req.idcreada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar un reporte externo
exports.registrarreporteexterno = async (req, res) => {
  try {
    const validationResponse = await tokenServices.decode(req.headers.token);
    const id = parseInt(req.body.id_equipo);
    const reporteexterno = JSON.parse(req.body.reporte);
    const nuevoHistorial = {
      identificacionDeReporte: res.locals.idcreada,
      fechaDeFinalizacion: reporteexterno.fechadefinalizacion,
      tipoDeAsistencia: reporteexterno.tipodeasistencia,
      responsableId: validationResponse.id,
      reporteExterno: 1,
      llaveReporte: res.locals.llave,
      fecha: new Date(),
    };

    await prisma.historialServicio.create({
      data: { ...nuevoHistorial, equipoId: id },
    });

    res.status(201).json({ message: 'Reporte externo registrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar un documento
exports.registrardocumento = async (req, res) => {
  try {
    const id = parseInt(req.body.id_equipo);
    const nombredocumento = JSON.parse(req.body.nombredocumento);
    const nuevoDocumento = {
      nombreDocumento: nombredocumento,
      llaveDocumento: res.locals.llave,
      fecha: new Date(),
    };

    await prisma.documentoLegal.create({
      data: { ...nuevoDocumento, equipoId: id },
    });

    res.status(201).json({ message: 'Documento registrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Buscar equipos
exports.buscar = async (req, res) => {
  try {
    const equipos = await prisma.equipo.findMany({
      where: { ...req.body.buscar },
      include: {
        propietario: true,
        cliente: true,
      },
    });
    res.status(200).json(equipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Listar un equipo por ID
exports.listaruno = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const equipo = await prisma.equipo.findUnique({
      where: { id },
      include: {
        referencia: true, // Incluye la información de la relación RefEquipo
        propietario: true, // Incluye la información del propietario (Cliente)
        cliente: true, // Incluye la información del cliente (Cliente)
        historialDeServicios: true, // Incluye el historial de servicios
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
// Buscar equipos de manera dinámica (incluyendo búsqueda por nombre del propietario)
exports.buscarequipos = async (req, res) => {
  try {
    // Obtén los parámetros de búsqueda del cuerpo de la solicitud
    const { nombre, serie, contrato, propietarioNombre } = req.body;

    // Construye el objeto `where` dinámicamente según los parámetros proporcionados
    const filtros = {};

    if (nombre) {
      filtros.nombre = { contains: nombre, mode: 'insensitive' }; // Busca equipos cuyo nombre contenga el texto (insensible a mayúsculas/minúsculas)
    }

    if (serie) {
      filtros.serie = { equals: serie }; // Busca equipos por serie exacta
    }

    if (contrato) {
      filtros.tipoDeContrato = { equals: contrato}; // Busca equipos por estado exacto
    }

    if (propietarioNombre) {
      // Filtro para buscar equipos por el nombre del propietario
      filtros.propietario = {
        nombre: { contains: propietarioNombre, mode: 'insensitive' }, // Busca propietarios cuyo nombre contenga el texto
      };
    }

    // Realiza la consulta con los filtros dinámicos
    const equipos = await prisma.equipo.findMany({
      where: filtros, // Aplica los filtros dinámicos
      include: {
        propietario: true, // Incluye información del propietario
        cliente: true, // Incluye información del cliente
        referencia: true, // Incluye información de la referencia
        historialDeServicios: true, // Incluye el historial de servicios
        documentosLegales: true, // Incluye documentos legales
      },
    });

    // Responde con los equipos encontrados
    res.status(200).json(equipos);
  } catch (err) {
    // Manejo de errores
    console.error('Error al buscar equipos:', err);
    res.status(500).json({ error: 'Ocurrió un error al buscar los equipos.', detalles: err.message });
  }
};