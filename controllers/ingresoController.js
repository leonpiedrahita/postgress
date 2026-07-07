

/**
 * Listar todos los ingresos
 */
exports.listarTodosLosIngresos = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
  try {
    const ingresos = await prisma.ingreso.findMany({
      include: {
        equipo: {
          include: {
            cliente: true,
            propietario: true,
            proveedor: true,
            historialPropietarios: {
              include: { propietario: true, cliente: true, proveedor: true },
              orderBy: { fecha: 'desc' },
            },
          },
        },
        etapas: { orderBy: { id: 'asc' } },
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos' });
  }
};

exports.listarIngresosAbiertos = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request

  try {
    // IDs ordenados por la etapa más reciente de cada ingreso abierto
    const idsResult = await prisma.$queryRaw`
      SELECT i.id
      FROM ingresos i
      LEFT JOIN etapas e ON e."ingresoId" = i.id
      WHERE i.estado = 'Abierto'
      GROUP BY i.id
      ORDER BY MAX(e."createdAt") DESC NULLS LAST
    `;
    const ids = idsResult.map(r => Number(r.id));

    const ingresosRaw = await prisma.ingreso.findMany({
      where: { id: { in: ids } },
      include: {
        equipo: {
          include: {
            cliente: true,
            propietario: true,
            proveedor: true,
            historialPropietarios: {
              include: { propietario: true, cliente: true, proveedor: true },
              orderBy: { fecha: 'desc' },
            },
          },
        },
        etapas: { orderBy: { id: 'asc' } },
      },
    });

    // Reordenar según el orden del $queryRaw
    const ingresosAbiertos = ids.map(id => ingresosRaw.find(i => i.id === id)).filter(Boolean);

    // 3. Enviar la respuesta
    res.status(200).json(ingresosAbiertos);
  } catch (err) {
    // 4. Manejo de errores
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos abiertos' });
  }
};
/**
 * Listar ingresos por estado
 */
exports.listarIngresosPorEstado = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
  try {
    const { estado } = req.params; // Estado enviado como parámetro
    const ESTADOS_VALIDOS = ['Abierto', 'Cerrado'];
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const ingresos = await prisma.ingreso.findMany({
      where: { estado },
      include: {
        equipo: true, // Incluye información del equipo relacionado
        etapas: { orderBy: { id: 'asc' } },
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos por estado' });
  }
};

/**
 * Listar ingresos por serie de equipo
 */
exports.listarIngresosPorSerieDeEquipo = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
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
        etapas: { orderBy: { id: 'asc' } },
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos por serie de equipo' });
  }
};

/**
 * Listar ingresos por nombre de cliente
 */
exports.listarIngresosPorNombreDeCliente = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
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
        etapas: { orderBy: { id: 'asc' } },
      },
    });
    res.status(200).json(ingresos.length > 0 ? ingresos : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos por nombre de cliente' });
  }
};
/**
 * Obtener un ingreso por ID junto con el equipo y las etapas relacionadas
 */
exports.obtenerIngresoPorId = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
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
        etapas: { orderBy: { id: 'asc' } },
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
    });
  }
};
/**
 * Registrar un nuevo ingreso
 */
exports.registrarIngreso = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
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
    const { etapaSeleccionada, ubicacionEtapaSeleccionada, comentario, nombre, responsable, fecha, ubicacion } = etapa;
    if (!etapaSeleccionada || !ubicacionEtapaSeleccionada || !nombre || !fecha || !ubicacion) {
      return res.status(400).json({
        error: 'Campos del formulario enviado faltantes',
      });
    }

    // Verificar si el equipo ya tiene un ingreso en estado "Abierta"
    const ingresoAbierto = await prisma.ingreso.findFirst({
      where: {
        equipoId: equipo.id,
        estado: 'Abierto',
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
        estado: 'Abierto', // Estado inicial
        etapaActual: 1, // Etapa actual inicial (int)
        ultimaEtapa: 1, // Última etapa inicial (int)
        etapas: {
          create: [
            {
              nombre: etapaSeleccionada, // Almacenar como string
              ubicacion: ubicacionEtapaSeleccionada,
              comentario,
              responsable,
              fecha
            },
            {
              nombre, // Almacenar como string
              ubicacion,
            },
          ],
        },
      },
      include: {
        etapas: { orderBy: { id: 'asc' } },
      },
    });

    // Enviar la respuesta con el ingreso creado
    res.status(201).json(nuevoIngreso);

    // Notificación WhatsApp — se omite para equipos recién creados
    if (etapaSeleccionada !== 'Equipo nuevo') {
      const { notificarIngresoEquipo } = require('../services/whatsappService');
      notificarIngresoEquipo(nuevoIngreso.id).catch(console.error);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al registrar el ingreso.' });
  }
};

/**
 * Agregar una nueva etapa a un ingreso con estado "Abierta" y actualizar la etapa más reciente.
 */
exports.agregarEtapa = async (req, res) => {
  const prisma = req.prisma; // Obtener el cliente Prisma del request
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
      nuevoestadoequipo,
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

    // Verificar si el ingreso existe y está en estado "Abierto"
    const ingreso = await prisma.ingreso.findUnique({
      where: { id: parseInt(ingresoId) },
      include: {
        equipo: { select: { id: true, nombre: true, ubicacionNombre: true } },
        etapas: { orderBy: { id: 'desc' }, take: 1 },
      },
    });

    if (!ingreso) {
      return res.status(404).json({ error: `No se encontró un ingreso con el id ${ingresoId}.` });
    }

    if (ingreso.estado !== 'Abierto') {
      return res.status(400).json({ error: `El ingreso con id ${ingresoId} no está en estado "Abierto".` });
    }

    // Detectar si la nueva etapa implica cambio de ubicación física
    const etapaMasReciente = ingreso.etapas[0];
    const ubicacionAnterior = etapaMasReciente?.ubicacion ?? null;
    const cambiaUbicacion = ubicacionAnterior !== null && ubicacionAnterior !== ubicacion;
    const ubicLower = (ubicacion || '').toLowerCase();
    const sinConfirmacion = !cambiaUbicacion || ubicLower.includes('cliente') || ubicLower.includes('dado de baja');
    const confirmadoNuevaEtapa = sinConfirmacion;

    if (etapaMasReciente) {
      await prisma.etapa.update({
        where: { id: etapaMasReciente.id },
        data: { fecha, responsable, comentario },
      });
    }

    // Crear la nueva etapa — confirmado=false si hay cambio de ubicación.
    // responsable/comentario/fecha quedan null: se completan cuando esta etapa
    // se cierre al registrarse la siguiente (ahí queda quién la cerró y cuándo).
    const nuevaEtapa = await prisma.etapa.create({
      data: {
        ingresoId: parseInt(ingresoId),
        nombre,
        comentario: null,
        responsable: null,
        fecha: null,
        ubicacion,
        confirmado: confirmadoNuevaEtapa,
      },
    });

    // Actualizar los campos etapaActual, ultimaEtapa y estado del ingreso
    const ingresoActualizado = await prisma.ingreso.update({
      where: { id: parseInt(ingresoId) },
      data: { etapaActual, ultimaEtapa, estado },
    });

    res.status(201).json({
      message: 'Etapa agregada y etapa más reciente actualizada exitosamente.',
      cambiaUbicacion,
      confirmado: confirmadoNuevaEtapa,
      etapaMasRecienteActualizada: { id: etapaMasReciente?.id, fecha, responsable, comentario },
      nuevaEtapa,
      ingresoActualizado,
    });

    // Notificaciones WhatsApp (no bloqueantes)
    const { notificarCambioEtapa } = require('../services/whatsappService');
    notificarCambioEtapa(parseInt(ingresoId), {
      etapaFinalizada: etapaMasReciente?.nombre || '',
      etapaNueva: nombre,
      ubicacion,
      comentario,
      responsable,
      estadoEquipo: nuevoestadoequipo || null,
    }).catch(console.error);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al agregar la etapa.' });
  }
};

/**
 * Confirmar la llegada física de un equipo a la nueva ubicación.
 * Solo roles bodega y administrador.
 */
exports.confirmarMovimiento = async (req, res) => {
  const prisma = req.prisma;
  try {
    const ingresoId = parseInt(req.params.ingresoId);
    const etapaId   = parseInt(req.params.etapaId);

    if (isNaN(ingresoId) || isNaN(etapaId)) {
      return res.status(400).json({ error: 'ingresoId y etapaId deben ser números válidos.' });
    }

    const etapa = await prisma.etapa.findUnique({
      where: { id: etapaId },
      include: { ingreso: { select: { id: true, equipoId: true, estado: true } } },
    });

    if (!etapa) return res.status(404).json({ error: 'Etapa no encontrada.' });
    if (etapa.ingresoId !== ingresoId) return res.status(400).json({ error: 'La etapa no pertenece al ingreso indicado.' });
    if (etapa.confirmado) return res.status(400).json({ error: 'Esta etapa ya fue confirmada.' });
    if (etapa.ingreso.estado !== 'Abierto') return res.status(400).json({ error: 'El ingreso ya está cerrado.' });

    const rol = req.usuario.rol;
    const ub = (etapa.ubicacion || '').toLowerCase();
    const esBodega = ub.includes('bodega');
    const esIngenieria = ['cuarentena', 'taller de ingenieria', 'taller de ingeniería', 'snibe'].some(t => ub.includes(t));
    const puedeConfirmar =
      (esBodega && ['bodega', 'administrador', 'ingresos'].includes(rol)) ||
      (esIngenieria && ['administrador', 'soporte', 'lumira', 'aplicaciones'].includes(rol));
    if (!puedeConfirmar) {
      return res.status(403).json({ error: 'No tienes permiso para confirmar esta ubicación.' });
    }

    const confirmadoPor = req.usuario.nombre;
    const fechaConfirmacion = new Date();

    // Solo se confirma la etapa (seguimiento interno). No se toca
    // Equipo.ubicacionNombre/ubicacionDireccion: esos campos representan la
    // ciudad/sede del cliente, no la ubicación interna de seguimiento.
    await prisma.etapa.update({
      where: { id: etapaId },
      data: { confirmado: true, confirmadoPor, fechaConfirmacion },
    });

    res.status(200).json({
      message: 'Movimiento confirmado.',
      etapaId,
      ubicacionConfirmada: etapa.ubicacion,
      confirmadoPor,
      fechaConfirmacion,
    });

    // Notificación WhatsApp de confirmación (no bloqueante)
    const { notificarConfirmacionMovimiento } = require('../services/whatsappService');
    notificarConfirmacionMovimiento(ingresoId, etapaId, { confirmadoPor }).catch(console.error);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al confirmar el movimiento.' });
  }
};

/**
 * Cuenta etapas pendientes de confirmación en ingresos abiertos.
 * Usado para el badge en la navegación del frontend.
 */
exports.contarMovimientosPendientes = async (req, res) => {
  const prisma = req.prisma;
  try {
    const count = await prisma.etapa.count({
      where: { confirmado: false, ingreso: { estado: 'Abierto' } },
    });
    res.status(200).json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al contar movimientos pendientes.' });
  }
};

/**
 * Lista etapas pendientes de confirmación con datos del equipo e ingreso.
 */
exports.listarMovimientosPendientes = async (req, res) => {
  const prisma = req.prisma;
  try {
    const etapas = await prisma.etapa.findMany({
      where: { confirmado: false, ingreso: { estado: 'Abierto' } },
      include: {
        ingreso: {
          select: {
            id: true,
            equipo: { select: { id: true, nombre: true, serie: true, cliente: { select: { nombre: true } } } },
            // Penúltima etapa: quien la cerró es quien registró el movimiento hacia esta ubicación.
            etapas: { orderBy: { id: 'desc' }, skip: 1, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const resultado = etapas.map(({ ingreso, ...etapa }) => ({
      ...etapa,
      responsable: ingreso.etapas[0]?.responsable ?? null,
      ingreso: { id: ingreso.id, equipo: ingreso.equipo },
    }));

    res.status(200).json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar movimientos pendientes.' });
  }
};

/**
 * Listar todos los ingresos de un equipo específico, ordenados por fecha de creación descendente.
 */
exports.listarPorEquipo = async (req, res) => {
  const prisma = req.prisma;
  try {
    const equipoId = parseInt(req.params.equipoId);
    const ingresos = await prisma.ingreso.findMany({
      where: { equipoId },
      include: { etapas: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(ingresos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al listar los ingresos del equipo.' });
  }
};

/**
 * Cerrar un ingreso: cambia su estado a "Cerrado".
 * Solo se puede cerrar si el ingreso está en estado "Abierto".
 */
exports.cerrar = async (req, res) => {
  const prisma = req.prisma;
  try {
    const ingresoId = parseInt(req.params.ingresoId);
    const ingreso = await prisma.ingreso.findUnique({ where: { id: ingresoId } });
    if (!ingreso) return res.status(404).json({ error: 'Ingreso no encontrado.' });
    if (ingreso.estado !== 'Abierto') {
      return res.status(400).json({ error: `El ingreso ya está en estado "${ingreso.estado}".` });
    }
    const actualizado = await prisma.ingreso.update({
      where: { id: ingresoId },
      data: { estado: 'Cerrado' },
    });
    res.status(200).json({ message: 'Ingreso cerrado correctamente.', ingreso: actualizado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error al cerrar el ingreso.' });
  }
};