const bcrypt = require("bcryptjs");
const tokenServices = require('../services/token');
const { getPrismaWithUser } = require('../src/prisma-client');
const { PrismaClient } = require('@prisma/client');

const prismaBase = new PrismaClient(); // Cliente sin extensiones

const getUserPrisma = async (req) => {
  const token = req.headers.token;
  const decoded = await tokenServices.decode(token);
  return getPrismaWithUser(decoded.nombre);
};

exports.listar = async (req, res, next) => {
  try {
    const prisma = await getUserPrisma(req);
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        firma: true
      }
    });
    res.status(200).json(usuarios);
  } catch (err) {
    console.error(err);
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
    const usuario = await prismaBase.usuario.findUnique({
      where: { email: req.body.email },
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Falló la autenticación' });
    }

    if (usuario.estado === 0) {
      return res.status(403).json({ message: 'Usuario inactivo. Contacte al administrador.' });
    }

    const isMatch = await bcrypt.compare(req.body.password, usuario.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Falló la autenticación' });
    }

    const token = tokenServices.encode(usuario);

    res.status(200).json({
      auth: true,
      tokenReturn: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
    next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const prisma = await getUserPrisma(req);
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

exports.actualizarfirma = async (req, res) => {
  try {
    const prisma = await getUserPrisma(req);
    const usuarioActualizado = await prisma.usuario.update({
      where: { email: req.body.email },
      data: { firma: req.body.firma },
    });

    res.status(200).json({
      message: 'Firma actualizada exitosamente',
      usuario: usuarioActualizado,
    });
  } catch (err) {
    console.error('Error al actualizar la firma:', err.message);
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.buscarfirma = async (req, res) => {
  try {
    const prisma = await getUserPrisma(req);
    const decoded = await tokenServices.decode(req.headers.token);

    if (!decoded.id) {
      return res.status(400).json({
        error: 'El token no contiene un ID válido para el usuario.',
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { firma: true },
    });

    if (usuario?.firma) {
      return res.status(200).json({ firma: usuario.firma });
    } else {
      return res.status(404).json({
        message: 'Firma No Registrada',
      });
    }
  } catch (err) {
    console.error('Error al buscar la firma:', err.message);
    res.status(500).json({
      error: err.message,
    });
  }
};
