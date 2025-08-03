const prisma = require('../src/prisma-client'); // Importa el cliente Prisma con la extensión de auditoría

exports.listar = async (req, res) => {
  const prisma = req.prisma;
  try {
    const clientes = await prisma.cliente.findMany({
      include: {
        sedes: {
          where: {
            activa: true,
          },
        },
        sedePrincipal: true,
      },
    });

    res.status(200).json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};

exports.registrar = async (req, res) => {
  const prisma = req.prisma;
  try {
    const { nombre, nit, sedePrincipal } = req.body;

    // Verifica si el cliente ya existe con el mismo NIT
    const existingCliente = await prisma.cliente.findUnique({
      where: { nit },
    });

    if (existingCliente) {
      return res.status(409).json({ message: 'Cliente existente' });
    }

    // Validación básica de sedePrincipal
    if (!sedePrincipal || !sedePrincipal.ciudad || !sedePrincipal.direccion) {
      return res.status(400).json({ message: 'Datos incompletos de la sede principal' });
    }

    // Crea el cliente y su sede principal asociada
    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        nit,
        sedes: {
          create: [
            {
              ciudad: sedePrincipal.ciudad,
              direccion: sedePrincipal.direccion,
              activa: sedePrincipal.activa ?? true,
            },
          ],
        },
      },
      include: {
        sedes: true,
      },
    });

    // Establece la sede recién creada como sede principal
    const sedeCreada = cliente.sedes[0];

    const clienteActualizado = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        sedePrincipalId: sedeCreada.id,
      },
      include: {
        sedePrincipal: true,
        sedes: true,
      },
    });

    res.status(201).json({ message: 'Cliente creado', cliente: clienteActualizado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};

exports.actualizar = async (req, res) => {
  const prisma = req.prisma;
  try {
    const id = parseInt(req.params.id);
    const { nombre, nit, sedePrincipal } = req.body;

    // Validación existencia del cliente
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!clienteExistente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Validar NIT duplicado en otro cliente
    if (nit && nit !== clienteExistente.nit) {
      const clienteConNit = await prisma.cliente.findUnique({
        where: { nit },
      });

      if (clienteConNit && clienteConNit.id !== id) {
        return res.status(409).json({ message: 'El NIT ya está en uso por otro cliente' });
      }
    }

    // Validar sedePrincipal
    if (!sedePrincipal || !sedePrincipal.ciudad || !sedePrincipal.direccion) {
      return res.status(400).json({ message: 'Datos incompletos de la sede principal' });
    }

    // Crear nueva sede
    const nuevaSede = await prisma.sede.create({
      data: {
        ciudad: sedePrincipal.ciudad,
        direccion: sedePrincipal.direccion,
        activa: sedePrincipal.activa ?? true,
        clienteId: id,
      },
    });

    // Actualizar cliente con nuevos datos y sedePrincipalId
    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: {
        nombre,
        nit,
        sedePrincipalId: nuevaSede.id,
      },
      include: {
        sedePrincipal: true,
        sedes: {
          where: { activa: true }
        }
      }
    });

    res.status(200).json({ message: 'Cliente actualizado', cliente: clienteActualizado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};
exports.agregarsede = async (req, res) => {
  const prisma = req.prisma;
  try {
    const clienteId = parseInt(req.params.id);

    // Verifica si el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Crear nueva sede
    const nuevaSede = await prisma.sede.create({
      data: {
        ciudad: req.body.ciudad,
        direccion: req.body.direccion,
        activa: req.body.activa ?? true,
        clienteId: clienteId,
      },
    });

    res.status(201).json({ message: 'Sede agregada', sede: nuevaSede });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};
exports.eliminarsede = async (req, res) => {
  const prisma = req.prisma;
  try {
    const sedeId = parseInt(req.body.sedeId);

    // Verifica si la sede existe
    const sede = await prisma.sede.findUnique({
      where: { id: sedeId },
    });

    if (!sede) {
      return res.status(404).json({ message: 'Sede no encontrada' });
    }

    // Marcar como inactiva
    const sedeActualizada = await prisma.sede.update({
      where: { id: sedeId },
      data: { activa: false },
    });

    res.status(200).json({ message: 'Sede desactivada', sede: sedeActualizada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};

