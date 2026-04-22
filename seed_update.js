const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany({ include: { sedePrincipal: true }, orderBy: { id: 'asc' } });
  const equipos  = await prisma.equipo.findMany({ include: { cliente: true }, orderBy: { id: 'asc' } });

  const byNombre = (n) => clientes.find(c => c.nombre === n);
  const sanVicente  = byNombre('Clínica San Vicente de Paúl');
  const laMerced    = byNombre('ESE Hospital La Merced');
  const bioanalisis = byNombre('Laboratorio Bioanalisis SAS');
  const cardioVid   = byNombre('Clinica Cardio VID');
  const biosystems  = byNombre('Biosystems SAS');

  // Proveedores variados para la mitad de los equipos (10)
  // Equipos impares → proveedor alternativo, pares → Biosystems
  const proveedoresAlternativos = [
    sanVicente,   // distribuidor interno
    laMerced,
    bioanalisis,
    cardioVid,
    sanVicente,
    laMerced,
    bioanalisis,
    cardioVid,
    sanVicente,
    laMerced,
  ];

  let i = 0;
  for (const equipo of equipos) {
    const sede = equipo.cliente?.sedePrincipal ||
                 clientes.find(c => c.id === equipo.clienteId)?.sedePrincipal;

    const esPar = equipo.id % 2 === 0;
    const nuevoProveedor = esPar ? biosystems : proveedoresAlternativos[i++ % proveedoresAlternativos.length];

    await prisma.equipo.update({
      where: { id: equipo.id },
      data: {
        ubicacionNombre:    sede?.ciudad    ?? equipo.ubicacionNombre,
        ubicacionDireccion: sede?.direccion ?? equipo.ubicacionDireccion,
        proveedorId: nuevoProveedor.id,
      }
    });

    const tag = esPar ? 'Biosystems (sin cambio)' : nuevoProveedor.nombre;
    console.log(`  Equipo ${equipo.serie.padEnd(10)} | cliente: ${equipo.cliente.nombre.padEnd(30)} | ciudad: ${(sede?.ciudad ?? '?').padEnd(12)} | proveedor: ${tag}`);
  }

  console.log('\nActualización completada.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
