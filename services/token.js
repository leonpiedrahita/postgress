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
    // Fecha actual en UTC
    const nowUTC = new Date();

    // Crear fecha de mañana a las 00:00 UTC
    const tomorrowMidnightUTC = new Date(Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate() + 1, // día siguiente
      0, 0, 0, 0
    ));

    // Timestamp en segundos
    const exp = Math.floor(tomorrowMidnightUTC.getTime() / 1000);

    const token = jwt.sign(
      {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        email: user.email,
        estado: user.estado,
        exp, // vencimiento exacto en medianoche UTC
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