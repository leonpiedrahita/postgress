const axios = require('axios');
const { getPrismaWithUser } = require('../src/prisma-client');

const prisma = getPrismaWithUser('sistema');

const WA_URL = `https://graph.facebook.com/${process.env.WHATSAPP_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;


/**
 * Obtiene los roles habilitados para un tipo de notificación desde la BD.
 * @param {'ingreso'|'etapa'} tipo
 * @returns {Promise<string[]>}
 */
const ETAPA_A_TIPO = {
  'Cuarentena':                       'etapa_cuarentena',
  'Soporte ingeniería':               'etapa_soporte_ingenieria',
  'Soporte aplicaciones':             'etapa_soporte_aplicaciones',
  'Listo para despacho':              'etapa_listo_despacho',
  'Cotización solicitada':            'etapa_cotizacion_solicitada',
  'Cotización aprobada':              'etapa_cotizacion_aprobada',
  'Pdte. de repuestos':               'etapa_pdte_repuestos',
  'Pdte. de aprobación de repuestos': 'etapa_pdte_aprobacion',
  'Despachado':                       'etapa_despachado',
  'Finalizado':                       'etapa_finalizado',
  'Cancelado':                        'etapa_cancelado',
};

async function getRolesHabilitados(tipo) {
  const global = await prisma.configuracionNotificacion.findUnique({
    where: { rol_tipoNotificacion: { rol: 'sistema', tipoNotificacion: 'global' } },
    select: { habilitado: true },
  });
  if (global && !global.habilitado) return [];

  const filas = await prisma.configuracionNotificacion.findMany({
    where: { tipoNotificacion: tipo, habilitado: true },
    select: { rol: true },
  });
  const roles = filas.map(f => f.rol);
  if (!roles.includes('administrador')) roles.push('administrador');
  return roles;
}

/**
 * Resuelve los usuarios a notificar a partir de los roles habilitados: los
 * roles no-comerciales se notifican completos, pero el rol 'comercial' solo
 * se notifica si está asignado como asesor del equipo en cuestión (evita
 * avisarle a comerciales sobre equipos de clientes que no son suyos).
 * @param {string[]} rolesHabilitados
 * @param {string|null|undefined} asesor - equipo.asesor
 * @param {{nombre: boolean}} [select] - campos a seleccionar (siempre incluye telefono)
 * @returns {Promise<Array<{telefono: string, nombre?: string}>>}
 */
async function usuariosParaNotificar(rolesHabilitados, asesor, select = {}) {
  const camposSelect = { ...select, telefono: true };
  const otrosRoles = rolesHabilitados.filter(r => r !== 'comercial');

  const [usuariosOtros, usuariosComercial] = await Promise.all([
    otrosRoles.length
      ? prisma.usuario.findMany({
          where: { rol: { in: otrosRoles }, estado: 1, telefono: { not: null } },
          select: camposSelect,
        })
      : Promise.resolve([]),
    rolesHabilitados.includes('comercial') && asesor
      ? prisma.usuario.findMany({
          where: { rol: 'comercial', estado: 1, telefono: { not: null }, nombre: asesor },
          select: camposSelect,
        })
      : Promise.resolve([]),
  ]);

  const vistos = new Set();
  return [...usuariosOtros, ...usuariosComercial].filter(u => {
    if (vistos.has(u.telefono)) return false;
    vistos.add(u.telefono);
    return true;
  });
}

/**
 * Valida formato E.164 (+57XXXXXXXXXX)
 * @param {string} numero
 * @returns {boolean}
 */
function esE164(numero) {
  return /^\+\d{7,15}$/.test(numero);
}

/**
 * Envía un mensaje usando una plantilla aprobada por Meta.
 * @param {string} destinatario - Número en formato E.164
 * @param {string} nombrePlantilla - Nombre exacto de la plantilla en Meta
 * @param {string} idioma - Código de idioma (ej: 'es_CO')
 * @param {Array} componentes - Array de componentes de la plantilla
 * @returns {Promise<object|null>}
 */
async function enviarPlantilla(destinatario, nombrePlantilla, idioma, componentes) {
  if (!esE164(destinatario)) {
    console.warn(`[WhatsApp] Número inválido (no E.164): ${destinatario}`);
    return null;
  }

  try {
    const response = await axios.post(WA_URL, {
      messaging_product: 'whatsapp',
      to: destinatario,
      type: 'template',
      template: {
        name: nombrePlantilla,
        language: { code: idioma },
        components: componentes,
      },
    }, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[WhatsApp] Plantilla "${nombrePlantilla}" enviada a ${destinatario}`);
    return response.data;
  } catch (err) {
    console.error(`[WhatsApp] Error enviando plantilla "${nombrePlantilla}" a ${destinatario}:`, err.response?.data || err.message);
    return null;
  }
}

/**
 * Envía un mensaje de texto libre. Solo usar dentro de la ventana de 24h.
 * @param {string} destinatario - Número en formato E.164
 * @param {string} texto - Cuerpo del mensaje
 * @returns {Promise<object|null>}
 */
async function enviarMensajeTexto(destinatario, texto) {
  if (!esE164(destinatario)) {
    console.warn(`[WhatsApp] Número inválido (no E.164): ${destinatario}`);
    return null;
  }

  try {
    const response = await axios.post(WA_URL, {
      messaging_product: 'whatsapp',
      to: destinatario,
      type: 'text',
      text: { body: texto },
    }, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[WhatsApp] Mensaje de texto enviado a ${destinatario}`);
    return response.data;
  } catch (err) {
    console.error(`[WhatsApp] Error enviando mensaje a ${destinatario}:`, err.response?.data || err.message);
    return null;
  }
}

/**
 * Notifica cuando se registra un nuevo ingreso de equipo.
 * Usa la plantilla "gomaint_nuevo_ingreso_responsable" (es_CO).
 * Destinatarios: roles habilitados para tipo "ingreso" en la tabla de
 * configuración; el rol comercial solo si está asignado como asesor del equipo.
 * @param {number} ingresoId
 * @returns {Promise<void>}
 */
async function notificarIngresoEquipo(ingresoId) {
  try {
    const rolesHabilitados = await getRolesHabilitados('ingreso');

    if (!rolesHabilitados.length) {
      console.warn('[WhatsApp] Ningún rol habilitado para notificaciones de ingreso.');
      return;
    }

    const ingreso = await prisma.ingreso.findUnique({
      where: { id: ingresoId },
      include: {
        equipo: { include: { cliente: true } },
        etapas: { orderBy: { id: 'asc' }, take: 1 },
      },
    });

    if (!ingreso) {
      console.warn(`[WhatsApp] Ingreso ${ingresoId} no encontrado para notificación.`);
      return;
    }

    const equipo = ingreso.equipo;
    const usuarios = await usuariosParaNotificar(rolesHabilitados, equipo.asesor, { nombre: true });

    if (!usuarios.length) {
      console.warn('[WhatsApp] No hay usuarios con teléfono registrado para notificar nuevo ingreso.');
      return;
    }

    const etapaInicial = ingreso.etapas[0];
    const fecha = new Date(ingreso.createdAt).toLocaleDateString('es-CO');

    const componentes = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: equipo.nombre },
          { type: 'text', text: equipo.serie },
          { type: 'text', text: equipo.cliente?.nombre || 'Sin cliente' },
          { type: 'text', text: fecha },
          { type: 'text', text: etapaInicial?.comentario || 'Sin observación' },
          { type: 'text', text: etapaInicial?.responsable || 'Sin responsable' },
        ],
      },
    ];

    for (const u of usuarios) {
      await enviarPlantilla(u.telefono, 'gomaint_nuevo_ingreso_responsable', 'es_CO', componentes);
    }
  } catch (err) {
    console.error('[WhatsApp] Error en notificarIngresoEquipo:', err.message);
  }
}

/**
 * Notifica el cambio de etapa en un ingreso.
 * Usa la plantilla "gomaint_notificacion_estado_y_etapa".
 *
 * Reglas fijas (independientes de la configuración):
 * - Sin notificación si etapaNueva === 'Finalizado' y etapaFinalizada === 'Despachado'
 * - Sin notificación si etapaFinalizada === 'Desinfección'
 * - bodega solo recibe si etapaNueva es 'Listo para despacho' o 'Despachado'
 *
 * @param {number} ingresoId
 * @param {{ etapaFinalizada: string, etapaNueva: string, ubicacion: string, comentario: string, responsable: string, estadoEquipo?: string }} datosEtapa
 * @returns {Promise<void>}
 */
async function notificarCambioEtapa(ingresoId, datosEtapa) {
  try {
    if (datosEtapa.etapaNueva === 'Finalizado' && datosEtapa.etapaFinalizada === 'Despachado') {
      console.log('[WhatsApp] Etapa Finalizado post-Despachado — omitiendo notificación.');
      return;
    }

    if (datosEtapa.etapaFinalizada === 'Desinfección') {
      console.log('[WhatsApp] Salida de Desinfección — omitiendo notificación.');
      return;
    }

    const tipoCfg = ETAPA_A_TIPO[datosEtapa.etapaNueva];
    if (!tipoCfg) {
      console.log(`[WhatsApp] Etapa "${datosEtapa.etapaNueva}" sin tipo de notificación configurado.`);
      return;
    }

    const rolesHabilitados = await getRolesHabilitados(tipoCfg);
    if (!rolesHabilitados.length) {
      console.warn(`[WhatsApp] Ningún rol habilitado para notificaciones de ${tipoCfg}.`);
      return;
    }

    const roles = rolesHabilitados;

    const ingreso = await prisma.ingreso.findUnique({
      where: { id: ingresoId },
      include: {
        equipo: {
          include: { cliente: { include: { sedePrincipal: true } } },
        },
      },
    });

    if (!ingreso) {
      console.warn(`[WhatsApp] Ingreso ${ingresoId} no encontrado para notificación de etapa.`);
      return;
    }

    const equipo = ingreso.equipo;
    const cliente = equipo.cliente;
    const ciudad = cliente?.sedePrincipal?.ciudad || 'Sin ciudad';
    const estadoEquipo = datosEtapa.estadoEquipo || equipo.estado || 'Sin estado';

    const ESTADOS_DISPONIBLE = ['Disponible', 'Disponible Pdte. MP.'];

    let usuarios;
    if (roles.includes('comercial')) {
      const otrosRoles = roles.filter(r => r !== 'comercial');
      const [usuariosOtros, usuariosComercial] = await Promise.all([
        otrosRoles.length
          ? prisma.usuario.findMany({
              where: { rol: { in: otrosRoles }, estado: 1, telefono: { not: null } },
              select: { telefono: true },
            })
          : Promise.resolve([]),
        ESTADOS_DISPONIBLE.includes(estadoEquipo)
          ? prisma.usuario.findMany({
              where: { rol: 'comercial', estado: 1, telefono: { not: null } },
              select: { telefono: true },
            })
          : equipo.asesor
            ? prisma.usuario.findMany({
                where: { rol: 'comercial', estado: 1, telefono: { not: null }, nombre: equipo.asesor },
                select: { telefono: true },
              })
            : Promise.resolve([]),
      ]);
      const vistos = new Set();
      usuarios = [...usuariosOtros, ...usuariosComercial].filter(u => {
        if (vistos.has(u.telefono)) return false;
        vistos.add(u.telefono);
        return true;
      });
    } else {
      usuarios = await prisma.usuario.findMany({
        where: { rol: { in: roles }, estado: 1, telefono: { not: null } },
        select: { telefono: true },
      });
    }

    if (!usuarios.length) {
      console.warn('[WhatsApp] No hay usuarios con teléfono registrado para notificar cambio de etapa.');
      return;
    }

    const componentes = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: cliente?.nombre || 'Sin cliente' },
          { type: 'text', text: `${equipo.nombre} - ${equipo.serie}` },
          { type: 'text', text: estadoEquipo },
          { type: 'text', text: datosEtapa.etapaFinalizada || 'N/A' },
          { type: 'text', text: datosEtapa.etapaNueva || 'Sin etapa' },
          { type: 'text', text: datosEtapa.ubicacion || 'Sin ubicación' },
          { type: 'text', text: datosEtapa.comentario || 'Sin observaciones' },
          { type: 'text', text: datosEtapa.responsable || 'Sin responsable' },
          { type: 'text', text: ciudad },
        ],
      },
    ];

    for (const u of usuarios) {
      await enviarPlantilla(u.telefono, 'gomaint_notificacion_estado_y_etapa', 'es_CO', componentes);
    }
  } catch (err) {
    console.error('[WhatsApp] Error en notificarCambioEtapa:', err.message);
  }
}

/**
 * Notifica a bodega y administrador que un equipo está en tránsito y requiere confirmación física.
 * @param {number} ingresoId
 * @param {number} etapaId
 * @param {{ equipoNombre: string, ubicacionOrigen: string, ubicacionDestino: string, registradoPor: string }} datos
 */
async function notificarMovimientoPendiente(ingresoId, etapaId, datos) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { rol: { in: ['bodega', 'administrador'] }, estado: 1, telefono: { not: null } },
      select: { nombre: true, telefono: true },
    });

    if (!usuarios.length) {
      console.warn('[WhatsApp] No hay usuarios bodega/admin para notificar movimiento pendiente.');
      return;
    }

    const componentes = [{
      type: 'body',
      parameters: [
        { type: 'text', text: datos.equipoNombre },
        { type: 'text', text: datos.ubicacionOrigen || 'Ubicación anterior' },
        { type: 'text', text: datos.ubicacionDestino },
        { type: 'text', text: datos.registradoPor },
      ],
    }];

    for (const u of usuarios) {
      await enviarPlantilla(u.telefono, 'gomaint_movimiento_pendiente', 'es_CO', componentes);
    }
  } catch (err) {
    console.error('[WhatsApp] Error en notificarMovimientoPendiente:', err.message);
  }
}

/**
 * Notifica a roles operativos que un movimiento fue confirmado físicamente.
 * El rol comercial solo se notifica si está asignado como asesor del equipo.
 * @param {number} ingresoId
 * @param {number} etapaId
 * @param {{ confirmadoPor: string }} datos
 */
async function notificarConfirmacionMovimiento(ingresoId, etapaId, datos) {
  try {
    const etapa = await prisma.etapa.findUnique({
      where: { id: etapaId },
      include: {
        ingreso: {
          include: { equipo: { include: { cliente: true } } },
        },
      },
    });

    if (!etapa) return;

    const rolesHabilitados = await getRolesHabilitados('ingreso');
    if (!rolesHabilitados.length) return;

    const equipo = etapa.ingreso.equipo;
    const usuarios = await usuariosParaNotificar(rolesHabilitados, equipo.asesor);

    if (!usuarios.length) return;

    const componentes = [{
      type: 'body',
      parameters: [
        { type: 'text', text: equipo.nombre },
        { type: 'text', text: equipo.serie },
        { type: 'text', text: etapa.ubicacion },
        { type: 'text', text: datos.confirmadoPor },
      ],
    }];

    for (const u of usuarios) {
      await enviarPlantilla(u.telefono, 'gomaint_movimiento_confirmado', 'es_CO', componentes);
    }
  } catch (err) {
    console.error('[WhatsApp] Error en notificarConfirmacionMovimiento:', err.message);
  }
}

module.exports = { enviarPlantilla, enviarMensajeTexto, notificarIngresoEquipo, notificarCambioEtapa, notificarMovimientoPendiente, notificarConfirmacionMovimiento };
