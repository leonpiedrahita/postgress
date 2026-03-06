const router = require('express').Router();
const usuarioController = require('../../../controllers/usuarioController');
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

// Rutas públicas (no requieren token)
router.post("/ingresar", usuarioController.ingresar);
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
router.patch("/actualizarfirma", auth.verificarAdmin, usuarioController.actualizarfirma);

// .com/api/firma/buscar
router.get("/buscarfirma", auth.verificarUsuario, usuarioController.buscarfirma);

// Cambiar contraseña del usuario autenticado
router.patch("/cambiarcontrasena", auth.verificarUsuario, usuarioController.cambiarContrasena);

module.exports = router;