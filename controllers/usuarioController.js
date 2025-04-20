
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

exports.actualizarfirma = async (req, res) => {
  try {
    // Decodificar el token para obtener el ID o email del usuario
    const validationResponse = await tokenServices.decode(req.headers.token);
       

    // Verifica que el ID del usuario esté presente en la respuesta decodificada
    if (!validationResponse.id) {
      return res.status(400).json({
        error: 'El token no contiene un ID válido para el usuario.',
      });
    }

    // Actualizar el campo firma del usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: validationResponse.id }, // Cambia esto a "email" si usas email en su lugar
      data: { firma: req.body.firma },
    });

    // Responder con la información del usuario actualizado
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
    // Decodificar el token para obtener el ID del usuario
    const validationResponse = await tokenServices.decode(req.headers.token);
    // Verificar si el ID del usuario está presente
    if (!validationResponse.id) {
      return res.status(400).json({
        error: 'El token no contiene un ID válido para el usuario.',
      });
    }

    // Buscar la firma del usuario en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { id: validationResponse.id },
      select: { firma: true }, // Solo seleccionamos el campo "firma"
    });

    // Verificar si el usuario tiene una firma registrada
    if (usuario && usuario.firma) {
      /* console.log('Firma encontrada:', usuario.firma); */
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