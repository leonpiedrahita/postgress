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
  const user = await prisma.usuario.findFirst({
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
    // Obtener el timestamp actual en segundos
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Calcular la expiración sumando 1 hora (3600 segundos)
    const exp = nowSeconds + (60 * 1200); // 60 segundos * 120 minutos = 7200 segundos (2 horas)

    const token = jwt.sign(
      {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        email: user.email,
        estado: user.estado,
        exp, // Vencimiento exacto en 2 horas
      },
      process.env.JWT_KEY
    );

    return token;
  },

  decode: async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);

      // Expiración en UTC
      console.log("Token válido hasta (UTC):", new Date(decoded.exp * 1000).toISOString());

      // Buscar usuario activo en la base de datos
      const user = await prisma.usuario.findFirst({
        where: {
          id: decoded.id,
          estado: 1,
        },
      });

      return user || false;
    } catch (error) {
      console.error("Error al verificar token:", error.name, error.message);
      if (error.name === "TokenExpiredError") {
        return "token vencido";
      }
      return false;
    }
  },

};