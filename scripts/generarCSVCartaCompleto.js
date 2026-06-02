/**
 * Genera test_cartera_completo.csv cubriendo todos los escenarios posibles
 * de la importación de cartera de clientes.
 *
 * Escenarios de negocio (backend importarAtencion):
 *   A. dias >= 90 + preventivo vencido  → 'Cartera - MP'
 *   B. dias >= 90 + preventivo OK       → 'Cartera'
 *   C. dias <  90 + preventivo vencido  → 'MP'
 *   D. dias <  90 + preventivo OK       → 'Autorizado'
 *   E. NIT ausente en CSV               → 'MP' o 'Autorizado' (sin cartera)
 *   F. NIT duplicado en CSV             → segundo valor sobreescribe al primero
 *   G. NIT en CSV sin equipos en BD     → entra al mapa pero sin efecto (phantom)
 *
 * Escenarios del parser frontend:
 *   H. Fila con < 3 columnas            → malformada (ignorada)
 *   I. NIT vacío                        → malformada (ignorada)
 *   J. Días no numérico                 → malformada (ignorada)
 *   K. Línea vacía                      → filtrada por l.trim()
 *   L. días = 0                         → válida, atencion = Autorizado/MP
 *   M. días = 89 (umbral -1)            → válida, NO Cartera
 *   N. días = 90 (umbral exacto)        → válida, SÍ Cartera
 *
 * Uso: node scripts/generarCSVCartaCompleto.js
 * Salida: GoMaint/test_cartera_completo.csv
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const NIT_BIOSYSTEMS = process.env.NIT_BIOSYSTEMS || '811003513';
const SALIDA = path.resolve(__dirname, '../../');

function preventivoVencido(equipo) {
  const periodicidad = equipo.referencia?.periodicidadmantenimiento;
  if (!equipo.fechaDePreventivo || periodicidad === 'Libre de mantenimiento') return false;
  const hoy = new Date();
  const limite = new Date(equipo.fechaDePreventivo);
  if (periodicidad === 'Anual')       limite.setMonth(limite.getMonth() + 12);
  else if (periodicidad === 'Semestral')  limite.setMonth(limite.getMonth() + 6);
  else if (periodicidad === 'Trimestral') limite.setMonth(limite.getMonth() + 3);
  else return false;
  return hoy > limite;
}

function limpiar(s) {
  return String(s || '').replace(/,/g, ' ').replace(/"/g, '').trim();
}

async function main() {
  // Consultar equipos activos con todos los campos necesarios para la decisión
  const equipos = await prisma.equipo.findMany({
    where: { estado: { not: 'Inactivo' } },
    select: {
      id: true,
      nombre: true,
      fechaDePreventivo: true,
      cliente:   { select: { nit: true, nombre: true } },
      proveedor: { select: { nit: true, nombre: true } },
      referencia: { select: { periodicidadmantenimiento: true } },
    },
  });

  // Agrupar equipos por NIT de búsqueda (lógica idéntica al backend)
  // Map: nitBuscar → { nombre, vencidos: [], noVencidos: [] }
  const nitMap = new Map();

  for (const eq of equipos) {
    const nitProv = String(eq.proveedor?.nit || '').trim();
    const esBiosystems = nitProv === NIT_BIOSYSTEMS;
    const nit    = esBiosystems ? String(eq.cliente?.nit  || '').trim() : nitProv;
    const nombre = esBiosystems ? limpiar(eq.cliente?.nombre) : limpiar(eq.proveedor?.nombre);
    if (!nit) continue;

    if (!nitMap.has(nit)) nitMap.set(nit, { nombre, vencidos: [], noVencidos: [] });
    const entry = nitMap.get(nit);
    if (preventivoVencido(eq)) entry.vencidos.push(eq.id);
    else                        entry.noVencidos.push(eq.id);
  }

  const entries     = [...nitMap.entries()].map(([nit, d]) => ({ nit, ...d }));
  const conVencidos = entries.filter(e => e.vencidos.length > 0);
  const sinVencidos = entries.filter(e => e.vencidos.length === 0 && e.noVencidos.length > 0);

  const lineas   = ['Cliente,Nombre Cliente,Menor_Dias_desde_Factura'];
  const resumen  = [];

  function fila(nit, nombre, dias, escenario, esperado) {
    lineas.push(`${nit},${nombre},${dias}`);
    resumen.push({ fila: lineas.length, nit, dias, escenario, esperado });
  }

  // ── A: dias >= 90 + vencido ────────────────────────────────────────────────
  if (conVencidos[0]) {
    const e = conVencidos[0];
    fila(e.nit, e.nombre, 120,
      'A - Cartera-MP',
      `Cartera - MP (${e.vencidos.length} eq vencidos${e.noVencidos.length ? ` + Cartera para ${e.noVencidos.length} no vencidos` : ''})`
    );
  }

  // ── B: dias >= 90 + sin vencidos ───────────────────────────────────────────
  if (sinVencidos[0]) {
    const e = sinVencidos[0];
    fila(e.nit, e.nombre, 90,
      'B - Cartera (umbral exacto 90)',
      `Cartera (${e.noVencidos.length} equipos, ninguno vencido)`
    );
  }

  // ── C: dias < 90 + vencido ─────────────────────────────────────────────────
  if (conVencidos[1]) {
    const e = conVencidos[1];
    fila(e.nit, e.nombre, 30,
      'C - MP',
      `MP (${e.vencidos.length} eq vencidos${e.noVencidos.length ? ` + Autorizado para ${e.noVencidos.length} no vencidos` : ''})`
    );
  } else if (conVencidos[0]) {
    // No hay un segundo NIT con vencidos: reutilizar el del escenario A
    // Esto también cubre escenario F (duplicado)
    const e = conVencidos[0];
    fila(e.nit, e.nombre + ' - DUPLICADO', 30,
      'C+F - MP y DUPLICADO (mismo NIT que A, dias=30 sobreescribe dias=120)',
      'MP para vencidos / Autorizado para no vencidos (dias=30 gana en el Map)'
    );
  }

  // ── D: dias < 90 + sin vencidos ────────────────────────────────────────────
  if (sinVencidos[1]) {
    const e = sinVencidos[1];
    fila(e.nit, e.nombre, 45,
      'D - Autorizado',
      `Autorizado (${e.noVencidos.length} equipos, ninguno vencido, dias=45 < 90)`
    );
  }

  // ── L: dias = 0 ────────────────────────────────────────────────────────────
  if (sinVencidos[2] || sinVencidos[0]) {
    const e = sinVencidos[2] || sinVencidos[0];
    fila(e.nit, e.nombre, 0,
      'L - dias = 0 (válido)',
      'Autorizado o MP — dias=0 no es NaN, se acepta'
    );
  }

  // ── M: días = 89 (umbral -1, no es Cartera) ───────────────────────────────
  if (sinVencidos[3] || sinVencidos[0]) {
    const e = sinVencidos[3] || sinVencidos[0];
    fila(e.nit, e.nombre, 89,
      'M - dias = 89 (justo bajo el umbral)',
      'Autorizado (89 < 90, no entra en Cartera)'
    );
  }

  // ── G: NIT phantom (en CSV pero sin equipos en BD) ────────────────────────
  fila('9999999999', 'CLIENTE INEXISTENTE EN BD', 60,
    'G - Phantom NIT',
    'Sin efecto sobre equipos — entra al Map pero ningún equipo lo busca'
  );

  // ── F: Duplicado explícito con primer NIT de la lista ─────────────────────
  if (entries[0] && !resumen.some(r => r.escenario.includes('DUPLICADO'))) {
    const e = entries[0];
    const primerValor = resumen.find(r => r.nit === e.nit)?.dias ?? '?';
    fila(e.nit, e.nombre + ' - DUPLICADO', 5,
      `F - DUPLICADO (NIT ya en fila anterior con dias=${primerValor}; dias=5 sobreescribe en el Map)`,
      'Autorizado o MP según preventivo (dias=5 < 90)'
    );
  }

  // ── FILAS MALFORMADAS (parser frontend) ───────────────────────────────────
  // K: línea vacía — filtrada por filter(l => l.trim()), nunca llega al parser
  lineas.push('');
  // H: menos de 3 columnas
  lineas.push('800190884,Solo dos columnas');
  // I: NIT vacío
  lineas.push(',Nombre sin NIT,45');
  // J: días no numérico
  lineas.push('800125481,Instituto del Torax,no-es-numero');
  // H: solo una columna
  lineas.push('111222333');

  // ── Escribir archivo ───────────────────────────────────────────────────────
  const rutaSalida = path.join(SALIDA, 'test_cartera_completo.csv');
  fs.writeFileSync(rutaSalida, lineas.join('\n'), 'utf8');

  // ── Imprimir resumen ───────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  CSV de prueba cartera — escenarios completos');
  console.log('══════════════════════════════════════════════');
  console.log(`Archivo: ${rutaSalida}`);
  console.log(`\nEquipos activos en BD : ${equipos.length}`);
  console.log(`NITs únicos           : ${nitMap.size}`);
  console.log(`  Con preventivo vencido : ${conVencidos.length}`);
  console.log(`  Sin preventivo vencido : ${sinVencidos.length}`);

  console.log('\n── Filas válidas ──────────────────────────────');
  resumen.forEach(r => {
    console.log(`  Fila ${String(r.fila).padStart(2)} | NIT ${r.nit.padEnd(12)} | dias=${String(r.dias).padStart(3)} | ${r.escenario}`);
    console.log(`          Esperado: ${r.esperado}`);
  });

  console.log('\n── Filas malformadas (parser frontend) ────────');
  console.log('  K: línea vacía          → filter(l.trim()) la elimina antes de parsear');
  console.log('  H: "800190884,Solo dos columnas" → partes.length < 3 → ignorada');
  console.log('  I: ",Nombre sin NIT,45"          → NIT vacío → ignorada');
  console.log('  J: "800125481,...,no-es-numero"  → isNaN(días) → ignorada');
  console.log('  H: "111222333"                   → partes.length < 3 → ignorada');
  console.log(`\n  Total filas malformadas esperadas: 4 (la línea vacía no cuenta)`);

  console.log(`\n── Escenario E (NIT ausente en CSV) ───────────`);
  const nitsEnCSV = new Set(resumen.map(r => r.nit));
  const nitsAusentes = entries.filter(e => !nitsEnCSV.has(e.nit));
  if (nitsAusentes.length) {
    nitsAusentes.forEach(e => {
      const esperado = e.vencidos.length > 0 ? 'MP' : 'Autorizado';
      console.log(`  NIT ${e.nit} (${e.nombre}) → ${esperado} (sin cartera, enBlanco++)`);
    });
  } else {
    console.log('  Todos los NITs de la BD están incluidos en el CSV.');
    console.log('  Para probar E: elimina manualmente una fila del CSV antes de importar.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
