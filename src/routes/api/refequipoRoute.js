const router = require('express').Router()
const refequipoController = require('../../../controllers/refequipoController')


//Hasta este punto ya vamos en api/refequipo ya comenzamos a
// manejar los metodos

//.com/api/refequipo/listar
router.get("/listar"/* ,auth.verificarAdministrador */,refequipoController.listar);

//.com/api/refequipo/registrar
router.post("/registrar",refequipoController.registrar);

router.patch("/actualizar/:id",refequipoController.actualizar);



//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
/* router.patch("/actualizar/:id",equipoController.actualizar);

router.get("/buscar",equipoController.buscar); */

module.exports = router;