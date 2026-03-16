/**
 * Script de prueba en vivo para las plantillas de WhatsApp.
 * Uso: node scripts/testWhatsapp.js +573001234567
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { enviarPlantilla } = require('../services/whatsappService');

const destinatario = process.argv[2];

if (!destinatario) {
  console.error('Uso: node scripts/testWhatsapp.js +57XXXXXXXXXX');
  process.exit(1);
}

async function main() {
  console.log(`\nEnviando 3 plantillas a ${destinatario}...\n`);

  // 1. gomaint_nuevo_ingreso
  console.log('1) Enviando gomaint_nuevo_ingreso...');
  const r1 = await enviarPlantilla(destinatario, 'gomaint_nuevo_ingreso', 'es_CO', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'Monitor Multiparámetros' }, // {{1}} equipo
        { type: 'text', text: 'SN-TEST-001' },             // {{2}} serie
        { type: 'text', text: 'Clínica Central' },         // {{3}} cliente
        { type: 'text', text: new Date().toLocaleDateString('es-CO') }, // {{4}} fecha
        { type: 'text', text: 'Pantalla dañada - prueba de notificación' }, // {{5}} observación
      ],
    },
  ]);
  console.log(r1 ? '   ✓ Enviado' : '   ✗ Falló', '\n');

  // 2. gomaint_equipo_disponible
  console.log('2) Enviando gomaint_equipo_disponible...');
  const r2 = await enviarPlantilla(destinatario, 'gomaint_equipo_disponible', 'es_CO', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'Disponible' },                          // {{1}} estado
        { type: 'text', text: 'Monitor Multiparámetros - SN-TEST-001' }, // {{2}} equipo - serie
        { type: 'text', text: 'Bodega Principal' },                    // {{3}} ubicación
        { type: 'text', text: 'Calibrado y listo para entrega' },      // {{4}} observaciones
      ],
    },
  ]);
  console.log(r2 ? '   ✓ Enviado' : '   ✗ Falló', '\n');

  // 3. gomaint_notificacion
  console.log('3) Enviando gomaint_notificacion...');
  const r3 = await enviarPlantilla(destinatario, 'gomaint_notificacion', 'es_CO', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'Clínica Central' },                      // {{1}} cliente
        { type: 'text', text: 'Monitor Multiparámetros - SN-TEST-001' }, // {{2}} equipo - serie
        { type: 'text', text: 'Recepción' },                             // {{3}} etapa finalizada
        { type: 'text', text: 'Diagnóstico técnico' },                  // {{4}} etapa iniciada
        { type: 'text', text: 'Taller electrónica' },                   // {{5}} ubicación
        { type: 'text', text: 'Revisión de tarjeta principal' },        // {{6}} comentario
        { type: 'text', text: 'Pedro Técnico' },                        // {{7}} responsable
      ],
    },
  ]);
  console.log(r3 ? '   ✓ Enviado' : '   ✗ Falló', '\n');

  console.log('Listo.');
}

main();
