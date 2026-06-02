/**
 * Genera test_cartera.csv y test_asesores.csv con clientes reales de la BD.
 * Uso: node scripts/generarCSVPrueba.js
 * Salida: archivos en la raíz del proyecto (GoMaint/)
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SALIDA = path.resolve(__dirname, '../../');

function limpiar(s) {
  return String(s || '').replace(/,/g, ' ').replace(/"/g, '');
}

async function main() {
  const clientes = await prisma.cliente.findMany({
    select: { nit: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });

  if (clientes.length === 0) {
    console.log('No hay clientes en la base de datos.');
    return;
  }

  // --- CSV Cartera ---
  const diasPorIndice = [15, 30, 45, 60, 90, 120];
  const lineasCartera = ['Cliente,Nombre Cliente,Menor_Dias_desde_Factura'];
  clientes.forEach((c, i) => {
    const dias = diasPorIndice[i % diasPorIndice.length];
    lineasCartera.push(`${limpiar(c.nit)},${limpiar(c.nombre)},${dias}`);
  });
  const rutaCartera = path.join(SALIDA, 'test_cartera.csv');
  fs.writeFileSync(rutaCartera, lineasCartera.join('\n'), 'utf8');

  // --- CSV Asesores ---
  const asesores = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez'];
  const lineasAsesores = ['Cliente,Nombre Cliente,Razon_social_vend'];
  clientes.forEach((c, i) => {
    const asesor = asesores[i % asesores.length];
    lineasAsesores.push(`${limpiar(c.nit)},${limpiar(c.nombre)},${asesor}`);
  });
  const rutaAsesores = path.join(SALIDA, 'test_asesores.csv');
  fs.writeFileSync(rutaAsesores, lineasAsesores.join('\n'), 'utf8');

  console.log(`\nClientes encontrados: ${clientes.length}`);
  console.log(`Cartera  → ${rutaCartera}`);
  console.log(`Asesores → ${rutaAsesores}`);
  console.log('\nPrimeras 5 filas (cartera):');
  lineasCartera.slice(0, 6).forEach(l => console.log(' ', l));
}

main().catch(console.error).finally(() => prisma.$disconnect());
