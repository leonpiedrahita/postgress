const bcrypt = require("bcryptjs");
const tokenServices = require('../services/token');
const { prisma: prismaPublico, getPrismaWithUser } = require('../src/prisma-client');

const getUserPrisma = async (req) => {
  const token = req.headers.token;
  const decoded = await tokenServices.decode(token);
  return getPrismaWithUser(decoded.nombre);
};

exports.listar = async (req, res, next) => {
  const prisma = req.prisma;
  try {
    const prisma = await getUserPrisma(req);
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        telefono: true,
        firma: true,
      }
    });
    res.status(200).json(usuarios);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.registrar = async (req, res, next) => {
   const prisma = req.prisma;
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
exports.actualizarContrasena = async (req, res, next) => {
    const prisma = req.prisma;
    const { id } = req.params; // Asumiendo que el ID viene en la ruta, ej: /api/users/123/password
    const { newPassword } = req.body;

    // 1. Validaciones básicas
    const regexContrasena = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!newPassword || !regexContrasena.test(newPassword)) {
        return res.status(400).json({ message: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.' });
    }

    try {
        // 2. Verificar si el usuario existe
        const existingUser = await prisma.usuario.findUnique({
            where: { id: parseInt(id) }, // Asegúrate de convertir el ID a entero si es un número
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // 3. Generar el hash de la nueva contraseña
        const hash = await bcrypt.hash(newPassword, 10);

        // 4. Actualizar la contraseña en la base de datos
        const usuarioActualizado = await prisma.usuario.update({
            where: { id: existingUser.id }, // Usar el ID entero del usuario existente
            data: {
                password: hash, // Guardar el nuevo hash
                // Puedes añadir un campo 'fechaActualizacionContrasena' si lo tienes en tu modelo
            },
            select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
                // NO devolver el campo 'password'
            }
        });

        // 5. Respuesta exitosa
        res.status(200).json({ message: 'Contraseña actualizada exitosamente', usuario: usuarioActualizado });

    } catch (err) {
        console.error("Error al actualizar la contraseña:", err);
        // Manejo de errores de Prisma u otros errores internos
        res.status(500).json({ message: 'Error interno del servidor al actualizar la contraseña.' });
        next(err);
    }
};

exports.ingresar = async (req, res, next) => {
  try {
    const usuario = await prismaPublico.usuario.findUnique({
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

    const accessToken = tokenServices.encode(usuario);
    const refreshToken = tokenServices.generateRefreshToken();
    const refreshTokenExp = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas desde ahora

    await prismaPublico.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshToken: tokenServices.hashRefreshToken(refreshToken),
        refreshTokenExp,
      },
    });

    res.status(200).json({
      auth: true,
      tokenReturn: accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
    next(err);
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token requerido' });
  }

  try {
    const tokenHash = tokenServices.hashRefreshToken(refreshToken);

    // Búsqueda directa por hash — O(1), sin iterar todos los usuarios
    const usuarioValido = await prismaPublico.usuario.findFirst({
      where: {
        estado: 1,
        refreshToken: tokenHash,
        refreshTokenExp: { gt: new Date() },
      },
    });

    if (!usuarioValido) {
      return res.status(401).json({ message: 'Refresh token inválido o expirado' });
    }

    // Emite nuevo access token (NO extiende la expiración del refresh token)
    const accessToken = tokenServices.encode(usuarioValido);

    res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Error en refresh:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.salir = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(200).json({ message: 'Sesión cerrada' });
  }

  try {
    const tokenHash = tokenServices.hashRefreshToken(refreshToken);

    // Búsqueda directa por hash — invalida solo el token correcto
    await prismaPublico.usuario.updateMany({
      where: { refreshToken: tokenHash },
      data: { refreshToken: null, refreshTokenExp: null },
    });

    res.status(200).json({ message: 'Sesión cerrada' });
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.actualizar = async (req, res, next) => {
  const prisma = req.prisma;
  try {
    const prisma = await getUserPrisma(req);
    const usuario = await prisma.usuario.update({
      where: { id: parseInt(req.params.id) },
      data: {
        nombre: req.body.nombre,
        email: req.body.email,
        rol: req.body.rol,
        estado: req.body.estado,
        telefono: req.body.telefono ?? undefined,
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
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID de usuario requerido' });

  try {
    const prisma = await getUserPrisma(req);
    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: { firma: req.body.firma },
      select: { id: true, nombre: true, email: true },
    });

    res.status(200).json({
      message: 'Firma actualizada exitosamente',
      usuario: usuarioActualizado,
    });
  } catch (err) {
    console.error('Error al actualizar la firma:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.buscarfirma = async (req, res) => {
  const prisma = req.prisma;
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

exports.cambiarContrasena = async (req, res) => {
  const prisma = req.prisma;
  const { newPassword } = req.body;
  const id = req.usuario.id;

  const regexContrasena = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/;
  if (!newPassword || !regexContrasena.test(newPassword)) {
    return res.status(400).json({ message: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.usuario.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
