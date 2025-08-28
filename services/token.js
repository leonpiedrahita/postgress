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
  // Fecha actual en hora de Colombia
  const nowCol = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  );

  // Configurar vencimiento a la medianoche siguiente (hora Colombia)
  const tomorrowMidnightCol = new Date(nowCol);
  tomorrowMidnightCol.setHours(24, 0, 0, 0); // próximo día a las 00:00

  // Pasar esa fecha a epoch (UTC, en segundos)
  const exp = Math.floor(tomorrowMidnightCol.getTime() / 1000);

  // Firmar token con expiración fija
  const token = jwt.sign(
    {
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      email: user.email,
      estado: user.estado,
      exp, // vencimiento exacto (medianoche Colombia)
    },
    process.env.JWT_KEY
  );

  return token;
},

  decode: async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY); // Verifica y devuelve el payload completo
    
    // Expiración en UTC
    console.log("Token válido hasta (UTC):", new Date(decoded.exp * 1000).toISOString());
    
    // Expiración en hora de Colombia
    console.log(
      "Token válido hasta (Colombia):",
      new Date(decoded.exp * 1000).toLocaleString("es-CO", { timeZone: "America/Bogota" })
    );

    // Buscar usuario activo en la base de datos
    const user = await prisma.usuario.findUnique({
      where: {
        id: decoded.id,
        estado: 1,
      },
    });

    if (user) {
      return user;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error al verificar token:", error.name, error.message);
    if (error.name === "TokenExpiredError") {
      return "token vencido";
    }
    return false;
  }
}
};