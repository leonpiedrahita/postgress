const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkToken = async (token) => {
  let localID = null;
  try {
    const { id } = jwt.verify(token, process.env.JWT_KEY); // Decodificar el token
    localID = id;
  } catch {
    return false;
  }

  // Buscar usuario activo en la base de datos
  const user = await prisma.usuario.findUnique({
    where: {
      id: localID,
      estado: 1,
    },
  });

  if (user) {
    const newToken = encode(user); // Generar un nuevo token
    return newToken;
  } else {
    return false;
  }
};

module.exports = {
  encode: (user) => {
    const token = jwt.sign(
      {
        id: user.id, // Cambiado de `user[0]._id` a `user.id` para Prisma
        nombre: user.nombre,
        rol: user.rol,
        email: user.email,
        estado: user.estado,
      },
      process.env.JWT_KEY, // Llave secreta
      {
        expiresIn: "3600000", // Expiración en milisegundos
      }
    );
    return token;
  },

  decode: async (token) => {
    try {
      const { id } = jwt.verify(token, process.env.JWT_KEY); // Verificar el token

      // Buscar usuario activo en la base de datos
      const user = await prisma.usuario.findUnique({
        where: {
          id: id,
          estado: 1,
        },
      });

      if (user) {
        return user;
      } else {
        return false;
      }
    } catch (error) {
      if (error.message === "jwt expired") {
        return "token vencido";
      }
      return false;
    }
  },
};