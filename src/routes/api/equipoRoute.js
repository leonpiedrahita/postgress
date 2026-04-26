const router = require('express').Router()
const equipoController = require('../../../controllers/equipoController')
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

//Hasta este punto ya vamos en api/usuario ya comenzamos a
// manejar los metodos

// Ruta pública (no requiere token ni cliente Prisma)

// A partir de aquí, se requiere token y se adjunta cliente Prisma
router.use(attachPrisma);
//.com/api/usuario/listar
router.get("/listar",auth.verificarUsuarioLum,equipoController.listar );

//.com/api/usuario/register
router.post("/registrar",auth.verificarAdminCalCot,equipoController.registrar);

//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",auth.verificarAdminCalCot,equipoController.actualizar);
router.patch("/actualizarestado/:id",auth.verificarAdminSopCotBodLum,equipoController.actualizarEstado);
router.get("/buscar",auth.verificarUsuarioLum,equipoController.buscar);
router.get("/listaruno/:id",auth.verificarUsuarioLum,equipoController.listaruno);
router.post("/buscarequipos",auth.verificarUsuarioLum,equipoController.buscarequipos);
router.get("/listartodos",auth.verificarUsuarioLum,equipoController.listarTodos);
router.patch("/actualizarcronograma",auth.verificarUsuario,equipoController.actualizarcronograma)
router.get("/preventivos",auth.verificarUsuarioLum,equipoController.listarPreventivos)
router.get("/auditlog/:id",auth.verificarAdmin,equipoController.listarAuditLog)
router.get("/historialestado/:id",auth.verificarUsuarioLum,equipoController.listarHistorialEstado)

module.exports = router;
