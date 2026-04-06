const tokenServices = require('../services/token'); // Importa el servicio de tokens

// Listar todos los equipos
exports.listar = async (req, res) => {
  const prisma = req.prisma;
  try {
    const equipos = await prisma.equipo.findMany({
      where: {
        estado: {
          not: 'Inactivo', //  Aquí se excluye el estado 'Inactivo'
        },
      },
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
        estado: req.body.nuevoequipo.estado,
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
    const id = parseInt(req.params.id);

    const {
      ubicacionNombre,
      ubicacionDireccion,
      clienteId,
      propietarioId,
      placaDeInventario,
      tipoDeContrato,
      estado,
      proveedorId
    } = req.body;

    // Validación de campos obligatorios
    if (!placaDeInventario || !tipoDeContrato || !ubicacionNombre || !ubicacionDireccion || !clienteId || !propietarioId || !proveedorId || !estado)  {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Verifica que el equipo exista
    const equipoActual = await prisma.equipo.findUnique({ where: { id } });
    if (!equipoActual) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    // Transacción: update + create
    const [updatedEquipo, historial] = await prisma.$transaction([
      prisma.equipo.update({
        where: { id },
        data: {
          ubicacionNombre,
          ubicacionDireccion,
          placaDeInventario,
          tipoDeContrato,
          estado,
          cliente: { connect: { id: clienteId } },
          propietario: { connect: { id: propietarioId } },
          proveedor: { connect: { id: proveedorId } },
        },
      }),
      prisma.historialPropietario.create({
        data: {
          clienteId,
          propietarioId,
          proveedorId,
          ubicacionNombre,
          ubicacionDireccion,
          responsableId: validationResponse.id,
          tipoDeContrato,
          fecha: new Date(),
          equipoId: id,
        },
      }),
    ]);

    res.status(200).json({ message: "Equipo actualizado", equipo: updatedEquipo, historial });

  } catch (err) {
    console.error("Error al actualizar el equipo:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.actualizarEstado = async (req, res) => {
  const prisma = req.prisma; // Asumiendo que Prisma Client está inyectado en req
  console.log('body', req.body);
  console.log('id', req.params.id);

  try {
    // 1. Decodificar el token para obtener el responsable (opcional, pero buena práctica si hay historial)
    // const validationResponse = await tokenServices.decode(req.headers.token);

    const id = parseInt(req.params.id);
    const { nuevoEstado } = req.body;

    // 2. Validación de campos obligatorios
    if (!nuevoEstado) {
      return res.status(400).json({ error: "El campo 'nuevoEstado' es obligatorio" });
    }

    // 3. Actualizar el estado del equipo
    const updatedEquipo = await prisma.equipo.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        // El campo 'updatedAt' se actualiza automáticamente gracias a @updatedAt en el schema
      },
      select: { // Seleccionamos solo los campos relevantes para la respuesta
        id: true,
        nombre: true,
        serie: true,
        estado: true,
        updatedAt: true,
      }
    });

    // 4. Notificación WhatsApp si el equipo queda disponible
    const ESTADOS_DISPONIBLE = ['En servicio', 'Disponible', 'Disp. Pdte. MP.'];
    if (ESTADOS_DISPONIBLE.includes(nuevoEstado)) {
      const { notificarEquipoDisponible } = require('../services/whatsappService');
      notificarEquipoDisponible(id, nuevoEstado).catch(console.error);
    }

    // 5. Respuesta exitosa
    res.status(200).json({
      message: `Estado del equipo ${id} actualizado a '${nuevoEstado}'`,
      equipo: updatedEquipo
    });

  } catch (err) {
    // Manejo de errores de Prisma (ej: equipo no encontrado)
    if (err.code === 'P2025') {
      return res.status(404).json({ error: `Equipo con ID ${req.params.id} no encontrado.` });
    }
    console.error("Error al actualizar el estado del equipo:", err);
    res.status(500).json({ error: err.message || "Ocurrió un error en el servidor." });
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
// Buscar equipos con texto libre y paginación del servidor
exports.buscarequipos = async (req, res) => {
  const prisma = req.prisma;
  try {
    const { texto, page = 1, limit = 20 } = req.body;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // WHERE para el count de Prisma
    const where = { estado: { not: 'Inactivo' } };
    const textoFiltro = texto && texto.trim() ? texto.trim() : null;

    if (textoFiltro) {
      const busqueda = { contains: textoFiltro, mode: 'insensitive' };
      where.OR = [
        { nombre: busqueda },
        { serie: busqueda },
        { cliente: { nombre: busqueda } },
        { propietario: { nombre: busqueda } },
        { ubicacionNombre: busqueda },
        { tipoDeContrato: busqueda },
        { estado: busqueda },
      ];
    }

    // IDs ordenados por fecha del último reporte de servicio
    let idsResult;
    if (textoFiltro) {
      const like = `%${textoFiltro}%`;
      idsResult = await prisma.$queryRaw`
        SELECT e.id
        FROM equipos e
        LEFT JOIN historial_servicios hs ON hs."equipoId" = e.id
        LEFT JOIN clientes c ON c.id = e."clienteId"
        LEFT JOIN clientes p ON p.id = e."propietarioId"
        WHERE e.estado != 'Inactivo'
          AND (
            e.nombre ILIKE ${like}
            OR e.serie ILIKE ${like}
            OR c.nombre ILIKE ${like}
            OR p.nombre ILIKE ${like}
            OR e."ubicacionNombre" ILIKE ${like}
            OR e."tipoDeContrato" ILIKE ${like}
            OR e.estado ILIKE ${like}
          )
        GROUP BY e.id
        ORDER BY MAX(hs.fecha) DESC NULLS LAST, e.id DESC
        LIMIT ${take} OFFSET ${skip}
      `;
    } else {
      idsResult = await prisma.$queryRaw`
        SELECT e.id
        FROM equipos e
        LEFT JOIN historial_servicios hs ON hs."equipoId" = e.id
        WHERE e.estado != 'Inactivo'
        GROUP BY e.id
        ORDER BY MAX(hs.fecha) DESC NULLS LAST, e.id DESC
        LIMIT ${take} OFFSET ${skip}
      `;
    }

    const ids = idsResult.map(r => Number(r.id));

    const [equiposRaw, total] = await Promise.all([
      prisma.equipo.findMany({
        where: { id: { in: ids } },
        include: {
          propietario: { select: { id: true, nombre: true, nit: true } },
          cliente: { select: { id: true, nombre: true, nit: true } },
          proveedor: { select: { id: true, nombre: true, nit: true } },
          referencia: { select: { id: true, periodicidadmantenimiento: true } },
          documentosLegales: { select: { id: true } },
          historialPropietarios: {
            include: {
              cliente: true,
              propietario: true,
              proveedor: true,
            },
          },
        },
      }),
      prisma.equipo.count({ where }),
    ]);

    // Reordenar según el orden del raw query
    const equipos = ids.map(id => equiposRaw.find(e => e.id === id)).filter(Boolean);

    res.status(200).json({ equipos, total });
  } catch (err) {
    console.error('Error al buscar equipos:', err);
    res.status(500).json({ error: 'Ocurrió un error al buscar los equipos.', detalles: err.message });
  }
};

// Listar todos los equipos sin paginación (para exportar a Excel y Cronograma)
exports.listarTodos = async (req, res) => {
  const prisma = req.prisma;
  try {
    const equipos = await prisma.equipo.findMany({
      where: { estado: { not: 'Inactivo' } },
      select: {
        nombre: true,
        marca: true,
        serie: true,
        ubicacionNombre: true,
        ubicacionDireccion: true,
        estado: true,
        tipoDeContrato: true,
        fechaDePreventivo: true,
        propietario: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        proveedor: { select: { nombre: true } },
        referencia: { select: { periodicidadmantenimiento: true } },
      },
      orderBy: { id: 'desc' },
    });
    res.status(200).json(equipos);
  } catch (err) {
    console.error('Error al listar todos los equipos:', err);
    res.status(500).json({ error: err.message });
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

exports.listarAuditLog = async (req, res) => {
  const prisma = req.prisma;
  const equipoId = parseInt(req.params.id);
  if (isNaN(equipoId)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const logs = await prisma.auditLog.findMany({
      where: { tableName: 'Equipo', recordId: equipoId },
      orderBy: { timestamp: 'desc' },
    });
    res.status(200).json(logs);
  } catch (err) {
    console.error('Error al obtener audit log:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.listarPreventivos = async (req, res) => {
  const prisma = req.prisma;
  try {
    const equipos = await prisma.equipo.findMany({
      where: {
        fechaDePreventivo: { not: null },
        estado: { not: 'Inactivo' },
        referencia: { periodicidadmantenimiento: { not: 'Libre de mantenimiento' } },
      },
      select: {
        id: true,
        nombre: true,
        serie: true,
        tipoDeContrato: true,
        ubicacionNombre: true,
        fechaDePreventivo: true,
        cliente: { select: { nombre: true } },
        propietario: { select: { nombre: true } },
        referencia: { select: { periodicidadmantenimiento: true } },
      },
      orderBy: { fechaDePreventivo: 'asc' },
    });
    res.status(200).json(equipos);
  } catch (err) {
    console.error('Error al listar preventivos:', err);
    res.status(500).json({ error: err.message });
  }
};