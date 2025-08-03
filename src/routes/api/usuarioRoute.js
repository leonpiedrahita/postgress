const router = require('express').Router();
const usuarioController = require('../../../controllers/usuarioController');
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

// Ruta pública (no requiere token ni cliente Prisma)
router.post("/ingresar", usuarioController.ingresar);

// A partir de aquí, se requiere token y se adjunta cliente Prisma
router.use(attachPrisma);

// .com/api/usuario/listar
router.get("/listar", auth.verificarAdmin, usuarioController.listar);

// .com/api/usuario/registrar
router.post("/registrar", auth.verificarAdmin, usuarioController.registrar);

// .com/api/usuario/actualizar/:id
router.patch("/actualizar/:id", auth.verificarAdmin, usuarioController.actualizar);

// .com/api/firma/registrar
router.patch("/actualizarfirma", auth.verificarAdmin, usuarioController.actualizarfirma);

// .com/api/firma/buscar
router.get("/buscarfirma", auth.verificarUsuario, usuarioController.buscarfirma);

module.exports = router;