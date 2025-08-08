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
router.get("/listar",auth.verificarUsuario,equipoController.listar );

//.com/api/usuario/register
router.post("/registrar",auth.verificarAdminCalCot,equipoController.registrar);

//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",auth.verificarAdminCalCot,equipoController.actualizar);

router.get("/buscar",auth.verificarUsuario,equipoController.buscar);
router.get("/listaruno/:id",auth.verificarUsuario,equipoController.listaruno);
router.post("/buscarequipos",auth.verificarUsuario,equipoController.buscarequipos);
router.patch("/actualizarcronograma",auth.verificarUsuario,equipoController.actualizarcronograma)

module.exports = router;