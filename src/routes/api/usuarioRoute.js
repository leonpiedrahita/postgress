const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const usuarioController = require('../../../controllers/usuarioController');
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                   // máximo 10 intentos por IP
  message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rutas públicas (no requieren token)
router.post("/ingresar", loginLimiter, usuarioController.ingresar);
router.post("/refresh", usuarioController.refresh);
router.post("/salir", usuarioController.salir);

// A partir de aquí, se requiere token y se adjunta cliente Prisma
router.use(attachPrisma);

// .com/api/usuario/listar
router.get("/listar", auth.verificarAdmin, usuarioController.listar);

// .com/api/usuario/registrar
router.post("/registrar", auth.verificarAdmin, usuarioController.registrar);

//

router.patch("/actualizarcontrasena/:id", auth.verificarAdmin, usuarioController.actualizarContrasena);

// .com/api/usuario/actualizar/:id
router.patch("/actualizar/:id", auth.verificarAdmin, usuarioController.actualizar);

// .com/api/firma/registrar
router.patch("/actualizarfirma/:id", auth.verificarAdmin, usuarioController.actualizarfirma);

// .com/api/firma/buscar
router.get("/buscarfirma", auth.verificarUsuario, usuarioController.buscarfirma);

// Cambiar contraseña del usuario autenticado
router.patch("/cambiarcontrasena", auth.verificarUsuario, usuarioController.cambiarContrasena);

module.exports = router;