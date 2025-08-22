const tokenServices = require('../services/token'); // Importa el servicio de tokens

// Listar todos los equipos
exports.listar = async (req, res) => {
  const prisma = req.prisma;
  try {
    const equipos = await prisma.equipo.findMany({
      include: {
        propietario: true, // Incluye información del propietario
        cliente: true, // Incluye información del cliente
        proveedor: true, // Incluye información del proveedor 
        referencia: true, // Incluye información de la referencia
        historialDeServicios: true, // Incluye el historial de servicios
        documentosLegales: true, // Incluye documentos legales
        historialPropietarios: {
          include: {
            cliente: true, // Incluye información del cliente en el historial
            propietario: true, // Incluye información del propietario en el historial
            proveedor: true, // Incluye información del proveedor en el historial 
            /* responsable: true, // Incluye información del responsable en el historial */
            // Incluye información del tipo de contrato en el historial
          },
        },

      }
    });
    res.status(200).json(equipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar un nuevo equipo
exports.registrar = async (req, res) => {
  const prisma = req.prisma;
  console.log('body', req.body);
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
        placaDeInventario: req.body.nuevoequipo.placaDeInventario,
        tipoDeContrato: req.body.nuevoequipo.tipoDeContrato,
        estado: 'Activo',
        ubicacionNombre: req.body.nuevoequipo.ubicacionNombre,
        ubicacionDireccion: req.body.nuevoequipo.ubicacionDireccion,
        proveedor: { connect: { id: req.body.nuevoequipo.proveedor.id } }, // Conecta al proveedor por ID
        referencia: { connect: { id: req.body.nuevoequipo.id } },
        propietario: { connect: { id: req.body.nuevoequipo.propietario.id } },
        cliente: { connect: { id: req.body.nuevoequipo.cliente.id } },


      },
    });
    // Crear el historial propietario como una nueva entrada en la tabla HistorialPropietario
    await prisma.historialPropietario.create({
      data: {
        clienteId: req.body.nuevoequipo.cliente.id,
        propietarioId: req.body.nuevoequipo.propietario.id,
        proveedorId: req.body.nuevoequipo.proveedor.id,
        ubicacionNombre: req.body.nuevoequipo.ubicacionNombre,
        ubicacionDireccion: req.body.nuevoequipo.ubicacionDireccion,
        responsableId: validationResponse.id,
        tipoDeContrato: req.body.nuevoequipo.tipoDeContrato,
        fecha: new Date(req.body.nuevoequipo.fechaDeMovimiento),
        equipoId: nuevoEquipo.id,
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
  const prisma = req.prisma;
  console.log('body', req.body);
  console.log('id', req.params.id);
  try {
    const validationResponse = await tokenServices.decode(req.headers.token);
    const id = parseInt(req.params.id); // Convierte el ID a número entero

    // Obtén los valores del cuerpo de la solicitud
    const {

      ubicacionNombre,
      ubicacionDireccion,
      clienteId,
      propietarioId,
      placaDeInventario,
      tipoDeContrato,
      proveedorId
    } = req.body;

    // Verifica que todos los campos obligatorios estén presentes
    if (!placaDeInventario || !tipoDeContrato || !ubicacionNombre || !ubicacionDireccion || !clienteId || !propietarioId || !proveedorId) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Obtén el equipo actual para acceder al historial existente
    const equipoActual = await prisma.equipo.findUnique({
      where: { id },

    });

    if (!equipoActual) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }



    // Actualiza los campos del equipo y el historial de propietarios
    const updatedEquipo = await prisma.equipo.update({
      where: { id },
      data: {
        // Actualiza la marca
        ubicacionNombre, // Actualiza la ubicación
        ubicacionDireccion, // Actualiza la dirección
        placaDeInventario, // Actualiza la placa de inventario
        tipoDeContrato, // Actualiza el tipo de contrato
        cliente: { connect: { id: clienteId } }, // Conecta al cliente por ID
        propietario: { connect: { id: propietarioId } }, // Conecta al propietario por ID
        proveedor: { connect: { id: proveedorId } }, // Conecta al proveedor por ID

      },
    });
    const nuevoHistorialdePropietario = {

      clienteId: req.body.clienteId,
      propietarioId: req.body.propietarioId,
      proveedorId: req.body.proveedorId,
      ubicacionNombre: req.body.ubicacionNombre,
      ubicacionDireccion: req.body.ubicacionDireccion,
      responsableId: validationResponse.id,
      tipoDeContrato, // Actualiza el tipo de contrato
      fecha: new Date(),
      equipoId: id,

    }

    await prisma.historialPropietario.create({
      data: { ...nuevoHistorialdePropietario, equipoId: id },
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
  const prisma = req.prisma;
  try {
    const validationResponse = await tokenServices.decode(req.headers.token);
    const id = parseInt(req.body.id_equipo);
    console.log('validationResponse', validationResponse)
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

    res.status(201).json({ message: 'Reporte registrado', identificacion: req.idcreada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar un reporte externo
exports.registrarreporteexterno = async (req, res) => {
  const prisma = req.prisma;
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
  const prisma = req.prisma;
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
  const prisma = req.prisma;
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
  const prisma = req.prisma;
  try {
    const id = parseInt(req.params.id);

    const equipo = await prisma.equipo.findUnique({
      where: { id },
      include: {
        propietario: true, // Incluye información del propietario
        cliente: true, // Incluye información del cliente
        proveedor: true, // Incluye información del proveedor 
        referencia: true, // Incluye información de la referencia
        historialDeServicios: {
          include: {
            responsable: true, // Incluye información del responsable en el historial de servicios
            reporte: true, // Incluye la identificación del reporte en el historial de servicios
            equipo: true, // Incluye información del equipo en el historial de servicios
            documentosSoporte: true

          }, // Incluye los documentos de soporte en el historial de servicios

        }, // Incluye el historial de servicios
        documentosLegales: true, // Incluye documentos legales
        historialPropietarios: {
          include: {
            cliente: true, // Incluye información del cliente en el historial
            propietario: true, // Incluye información del propietario en el historial
            proveedor: true, // Incluye información del proveedor en el historial 
            /* responsable: true, // Incluye información del responsable en el historial */
          },
        },
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
  const prisma = req.prisma;
  try {
    // Obtén los parámetros de búsqueda del cuerpo de la solicitud
    const { nombre, serie, contrato, clienteNombre } = req.body;

    // Construye el objeto `where` dinámicamente según los parámetros proporcionados
    const filtros = {};

    if (nombre) {
      filtros.nombre = { contains: nombre, mode: 'insensitive' }; // Busca equipos cuyo nombre contenga el texto (insensible a mayúsculas/minúsculas)
    }

    if (serie) {
      filtros.serie = { equals: serie }; // Busca equipos por serie exacta
    }

    if (contrato) {
      filtros.tipoDeContrato = { equals: contrato }; // Busca equipos por estado exacto
    }

    if (clienteNombre) {
      // Filtro para buscar equipos por el nombre del propietario
      filtros.cliente = {
        nombre: { contains: clienteNombre, mode: 'insensitive' }, // Busca propietarios cuyo nombre contenga el texto
      };
    }

    // Realiza la consulta con los filtros dinámicos
    const equipos = await prisma.equipo.findMany({
      where: filtros, // Aplica los filtros dinámicos
      include: {
        propietario: true, // Incluye información del propietario
        cliente: true, // Incluye información del cliente
        proveedor: true, // Incluye información del proveedor 
        referencia: true, // Incluye información de la referencia
        historialDeServicios: {
          include: {
            responsable: true, // Incluye información del responsable en el historial de servicios
            reporte: true, // Incluye la identificación del reporte en el historial de servicios
            equipo: true, // Incluye información del equipo en el historial de servicios
            documentosSoporte: true

          }, // Incluye los documentos de soporte en el historial de servicios

        }, // Incluye el historial de servicios
        documentosLegales: true, // Incluye documentos legales
        historialPropietarios: {
          include: {
            cliente: true, // Incluye información del cliente en el historial
            propietario: true, // Incluye información del propietario en el historial
            proveedor: true, // Incluye información del proveedor en el historial 
            /* responsable: true, // Incluye información del responsable en el historial */
          },
        },
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
// Registrar un reporte externo
exports.actualizarcronograma = async (req, res) => {
  const prisma = req.prisma;
  const { id_equipo, fechaDePreventivo } = req.body;
  console.log('id_equipo', id_equipo);
  console.log('fechaDePreventivo', fechaDePreventivo);
  try {
    const equipoActualizado = await prisma.equipo.update({
      where: { id: parseInt(id_equipo) },
      data: { fechaDePreventivo: new Date(fechaDePreventivo) },
    });

    res.status(200).json({ message: "Fecha de preventivo actualizada", equipo: equipoActualizado });
  } catch (error) {
    console.error('Error actualizando fecha de cronograma equipo:', error);
    res.status(500).json({ error: 'Error actualizando fecha de cronograma equipo' });
  }
};