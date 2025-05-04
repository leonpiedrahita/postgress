const router = require('express').Router()
const refequipoController = require('../../../controllers/refequipoController')
const auth = require('../../middleware/auth');

//Hasta este punto ya vamos en api/refequipo ya comenzamos a
// manejar los metodos

//.com/api/refequipo/listar
router.get("/listar",auth.verificarUsuario,refequipoController.listar);

//.com/api/refequipo/registrar
router.post("/registrar",auth.verificarAdminCal,refequipoController.registrar);

router.patch("/actualizar/:id",auth.verificarAdminCal,refequipoController.actualizar);

router.get("/listaruno/:id",auth.verificarUsuario,refequipoController.listaruno);


//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
/* router.patch("/actualizar/:id",equipoController.actualizar);

router.get("/buscar",equipoController.buscar); */

module.exports = router;