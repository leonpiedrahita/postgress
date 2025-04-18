const prisma = require('../src/prisma-client'); // Importa el cliente Prisma con la extensión de auditoría

exports.listar = async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany();
    res.status(200).json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};

exports.registrar = async (req, res) => {
  try {
    // Verifica si el cliente ya existe con el mismo NIT
    const existingCliente = await prisma.cliente.findUnique({
      where: { nit: req.body.nit },
    });

    if (existingCliente) {
      return res.status(409).json({ message: 'Cliente existente' });
    }

    // Crea un nuevo cliente
    const cliente = await prisma.cliente.create({
      data: {
        nombre: req.body.nombre,
        nit: req.body.nit,
        contactoprincipal: req.body.contactoprincipal, // Json
      },
    });

    res.status(201).json({ message: 'Cliente creado', cliente });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: req.body, // Actualiza los campos dinámicamente
    });

    res.status(200).json({ message: 'Cliente actualizado', cliente: clienteActualizado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};

exports.agregarsede = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Obtener el cliente actual para leer el campo `sede`
    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Si `sede` es null o undefined, inicializarlo como un array vacío
    const sedesActualizadas = cliente.sede ? [...cliente.sede] : [];

    // Agregar la nueva sede al array
    sedesActualizadas.push({
      nombre: req.body.nombre,
      direccion: req.body.direccion,
      idcliente: id,
    });

    // Actualizar el campo `sede` con el nuevo array
    await prisma.cliente.update({
      where: { id },
      data: {
        sede: sedesActualizadas,
      },
    });

    res.status(200).json({ message: 'Sede agregada', sedes: sedesActualizadas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};

exports.eliminarsede = async (req, res) => {
  try {
    const idcliente = parseInt(req.body.idcliente);

    // Filtra la sede a eliminar del campo `sede`
    const cliente = await prisma.cliente.findUnique({
      where: { id: idcliente },
    });

    if (!cliente || !cliente.sede) {
      return res.status(404).json({ message: 'Cliente o sede no encontrada' });
    }

    const sedesActualizadas = cliente.sede.filter(
      (sede) => sede.nombre !== req.body.nombre
    );

    await prisma.cliente.update({
      where: { id: idcliente },
      data: { sede: sedesActualizadas },
    });

    res.status(200).json({ message: 'Sede eliminada', sedes: sedesActualizadas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};