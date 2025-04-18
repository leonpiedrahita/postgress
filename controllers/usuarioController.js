
const bcrypt = require("bcryptjs");
const tokenServices = require('../services/token');
const prisma = require('../src/prisma-client'); // Importa el cliente Prisma con la extensión de auditoría

exports.listar = async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.status(200).json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
    next(err);
  }
};

exports.registrar = async (req, res, next) => {
  try {
    const existingUser = await prisma.usuario.findUnique({
      where: { email: req.body.email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email existente' });
    }

    const hash = await bcrypt.hash(req.body.password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: req.body.nombre,
        email: req.body.email,
        password: hash,
        rol: req.body.rol,
      },
    });

    res.status(201).json({ message: 'Usuario creado', usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
    next(err);
  }
};

exports.ingresar = async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: req.body.email },
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Falló la autenticación' });
    }

    const isMatch = await bcrypt.compare(req.body.password, usuario.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Falló la autenticación' });
    }

    // Generamos el token
    const token = tokenServices.encode(usuario); // Esta función genera el token
    res.status(200).json({
      auth: true,
      tokenReturn: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
    next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.update({
      where: { id: parseInt(req.params.id) },
      data: {
        nombre: req.body.nombre,
        email: req.body.email,
        rol: req.body.rol,
        estado: req.body.estado,
      },
    });

    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
    next(err);
  }
};