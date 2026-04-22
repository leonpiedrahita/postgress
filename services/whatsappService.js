const axios = require('axios');
const { getPrismaWithUser } = require('../src/prisma-client');

const prisma = getPrismaWithUser('sistema');

const WA_URL = `https://graph.facebook.com/${process.env.WHATSAPP_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;


/**
 * Obtiene los roles habilitados para un tipo de notificación desde la BD.
 * @param {'ingreso'|'etapa'} tipo
 * @returns {Promise<string[]>}
 */
async function getRolesHabilitados(tipo) {
  const filas = await prisma.$queryRaw`
    SELECT rol FROM configuracion_notificaciones
    WHERE tipo_notificacion = ${tipo} AND habilitado = true
  `;
  const roles = filas.map(f => f.rol);
  if (!roles.includes('administrador')) roles.push('administrador');
  return roles;
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
 * Usa la plantilla "gomaint_nuevo_ingreso".
 * Destinatarios: roles habilitados para tipo "ingreso" en la tabla de configuración.
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

    const usuarios = await prisma.usuario.findMany({
      where: {
        rol: { in: rolesHabilitados },
        estado: 1,
        telefono: { not: null },
      },
      select: { nombre: true, telefono: true },
    });

    if (!usuarios.length) {
      console.warn('[WhatsApp] No hay usuarios con teléfono registrado para notificar nuevo ingreso.');
      return;
    }

    const equipo = ingreso.equipo;
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
        ],
      },
    ];

    for (const u of usuarios) {
      await enviarPlantilla(u.telefono, 'gomaint_nuevo_ingreso', 'es_CO', componentes);
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

    // Seleccionar configuración según si la nueva etapa es Despachado o no
    const tipoCfg = datosEtapa.etapaNueva === 'Despachado' ? 'etapa_despachado' : 'etapa';
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

    const usuarios = await prisma.usuario.findMany({
      where: { rol: { in: roles }, estado: 1, telefono: { not: null } },
      select: { telefono: true },
    });

    if (!usuarios.length) {
      console.warn('[WhatsApp] No hay usuarios con teléfono registrado para notificar cambio de etapa.');
      return;
    }

    const equipo = ingreso.equipo;
    const cliente = equipo.cliente;
    const ciudad = cliente?.sedePrincipal?.ciudad || 'Sin ciudad';
    const estadoEquipo = datosEtapa.estadoEquipo || equipo.estado || 'Sin estado';

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

module.exports = { enviarPlantilla, enviarMensajeTexto, notificarIngresoEquipo, notificarCambioEtapa };
