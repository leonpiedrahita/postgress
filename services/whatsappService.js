const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const WA_URL = `https://graph.facebook.com/${process.env.WHATSAPP_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;

// Roles excluidos de notificaciones de nuevo ingreso (lumira sí recibe)
const ROLES_SIN_NOTIFICACION_INGRESO = ['ventas', 'ingresos', 'calidad'];


// Roles base para notificaciones de cambio de etapa
const ROLES_BASE_ETAPA = ['administrador', 'soporte', 'aplicaciones', 'comercial', 'cotizaciones'];

// Etapas que incluyen bodega en los destinatarios
const ETAPAS_BODEGA = ['Listo para despacho', 'Despachado'];

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
 * Destinatarios: todos los roles internos excepto ventas, ingresos, calidad y lumira.
 * @param {number} ingresoId
 * @returns {Promise<void>}
 */
async function notificarIngresoEquipo(ingresoId) {
  try {
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
        rol: { notIn: ROLES_SIN_NOTIFICACION_INGRESO },
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
 * Reglas de envío:
 * - Nunca notifica si etapaNueva === 'Finalizado' y etapaFinalizada === 'Despachado'
 * - Incluye bodega solo si etapaNueva es 'Listo para despacho' o 'Despachado'
 * - Nunca notifica a ventas, ingresos, calidad ni lumira
 *
 * Parámetros de la plantilla:
 * {{1}} nombre cliente, {{2}} equipo-serie, {{3}} estado equipo,
 * {{4}} etapa finalizada, {{5}} etapa iniciada, {{6}} ubicación,
 * {{7}} observaciones, {{8}} responsable, {{9}} ciudad cliente
 *
 * @param {number} ingresoId
 * @param {{ etapaFinalizada: string, etapaNueva: string, ubicacion: string, comentario: string, responsable: string, estadoEquipo?: string }} datosEtapa
 * @returns {Promise<void>}
 */
async function notificarCambioEtapa(ingresoId, datosEtapa) {
  try {
    // Regla: Finalizado posterior a Despachado → sin notificación
    if (datosEtapa.etapaNueva === 'Finalizado' && datosEtapa.etapaFinalizada === 'Despachado') {
      console.log('[WhatsApp] Etapa Finalizado post-Despachado — omitiendo notificación.');
      return;
    }

    // Regla: salida de Desinfección hacia cualquier etapa → sin notificación
    if (datosEtapa.etapaFinalizada === 'Desinfección') {
      console.log('[WhatsApp] Salida de Desinfección — omitiendo notificación.');
      return;
    }

    const ingreso = await prisma.ingreso.findUnique({
      where: { id: ingresoId },
      include: {
        equipo: {
          include: {
            cliente: { include: { sedePrincipal: true } },
          },
        },
      },
    });

    if (!ingreso) {
      console.warn(`[WhatsApp] Ingreso ${ingresoId} no encontrado para notificación de etapa.`);
      return;
    }

    // Determinar roles destinatarios según la etapa:
    // - Bodega solo en "Listo para despacho" y "Despachado"
    // - Lumira siempre (el único caso sin notificación ya fue interceptado arriba: Finalizado+Despachado)
    const incluirBodega = ETAPAS_BODEGA.includes(datosEtapa.etapaNueva);
    const roles = [
      ...ROLES_BASE_ETAPA,
      ...(incluirBodega ? ['bodega'] : []),
      'lumira',
    ];

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
          { type: 'text', text: cliente?.nombre || 'Sin cliente' },            // {{1}}
          { type: 'text', text: `${equipo.nombre} - ${equipo.serie}` },        // {{2}}
          { type: 'text', text: estadoEquipo },                                // {{3}}
          { type: 'text', text: datosEtapa.etapaFinalizada || 'N/A' },         // {{4}}
          { type: 'text', text: datosEtapa.etapaNueva || 'Sin etapa' },        // {{5}}
          { type: 'text', text: datosEtapa.ubicacion || 'Sin ubicación' },     // {{6}}
          { type: 'text', text: datosEtapa.comentario || 'Sin observaciones' },// {{7}}
          { type: 'text', text: datosEtapa.responsable || 'Sin responsable' }, // {{8}}
          { type: 'text', text: ciudad },                                      // {{9}}
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
