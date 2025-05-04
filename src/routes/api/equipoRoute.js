const router = require('express').Router()
const equipoController = require('../../../controllers/equipoController')
const auth = require('../../middleware/auth');
//Hasta este punto ya vamos en api/usuario ya comenzamos a
// manejar los metodos

//.com/api/usuario/listar
router.get("/listar",auth.verificarUsuario,equipoController.listar );

//.com/api/usuario/register
router.post("/registrar",auth.verificarAdminCal,equipoController.registrar);

//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",auth.verificarAdminCal,equipoController.actualizar);

router.get("/buscar",auth.verificarUsuario,equipoController.buscar);
router.get("/listaruno/:id",auth.verificarUsuario,equipoController.listaruno);
router.post("/buscarequipos/",auth.verificarUsuario,equipoController.buscarequipos);

module.exports = router;