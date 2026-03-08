const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const WA_URL = `https://graph.facebook.com/${process.env.WHATSAPP_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;

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
 * @param {string} idioma - Código de idioma (ej: 'es')
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
 * Notifica a los administradores cuando se registra un nuevo ingreso de equipo.
 * Usa la plantilla aprobada "gomaint_nuevo_ingreso".
 * @param {number} ingresoId - ID del ingreso recién creado
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

    const admins = await prisma.usuario.findMany({
      where: { rol: 'administrador', estado: 1, telefono: { not: null } },
      select: { nombre: true, telefono: true },
    });

    if (!admins.length) {
      console.warn('[WhatsApp] No hay administradores con teléfono registrado para notificar.');
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

    for (const admin of admins) {
      await enviarPlantilla(admin.telefono, 'gomaint_nuevo_ingreso', 'es', componentes);
    }
  } catch (err) {
    console.error('[WhatsApp] Error en notificarIngresoEquipo:', err.message);
  }
}

module.exports = { enviarPlantilla, enviarMensajeTexto, notificarIngresoEquipo };
