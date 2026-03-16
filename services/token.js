const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  /**
   * Genera un UUID aleatorio para usar como refresh token (valor plano para el cliente).
   * El hash de este valor se almacena en BD.
   */
  generateRefreshToken: () => crypto.randomUUID(),

  /**
   * Genera un access token JWT con expiración de 2 horas.
   */
  encode: (user) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const exp = nowSeconds + 7200; // 2 horas

    const token = jwt.sign(
      {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        email: user.email,
        estado: user.estado,
        exp,
      },
      process.env.JWT_KEY
    );

    return token;
  },

  /**
   * Verifica un access token JWT y retorna el usuario activo o 'token vencido' / false.
   */
  decode: async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);

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
