const express = require('express');
const router = express.Router();

// GET /api/whatsapp/webhook — verificación de Meta
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verificado correctamente.');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp] Verificación de webhook fallida. Token incorrecto.');
  return res.sendStatus(403);
});

// POST /api/whatsapp/webhook — recibe eventos de Meta
router.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object !== 'whatsapp_business_account') {
    return res.sendStatus(404);
  }

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  // Mensajes entrantes
  if (value?.messages?.length) {
    const msg = value.messages[0];
    const from = msg.from;
    const tipo = msg.type;
    console.log(`[WhatsApp] Mensaje entrante de ${from} — tipo: ${tipo}`);
  }

  // Actualizaciones de estado (enviado, entregado, leído, fallido)
  if (value?.statuses?.length) {
    const status = value.statuses[0];
    console.log(`[WhatsApp] Estado del mensaje ${status.id}: ${status.status}`);
  }

  // Siempre responder 200 rápido para que Meta no reintente
  return res.sendStatus(200);
});

module.exports = router;
