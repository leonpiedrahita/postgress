const router = require('express').Router()
const usuarioController = require('../../../controllers/usuarioController')
const auth = require('../../middleware/auth');
//Hasta este punto ya vamos en api/usuario ya comenzamos a
// manejar los metodos

//.com/api/usuario/listar
router.get("/listar",auth.verificarAdmin,usuarioController.listar);

//.com/api/usuario/register
router.post("/registrar",auth.verificarAdmin,usuarioController.registrar);

//.com/api/usuario/ingresar
router.post("/ingresar",usuarioController.ingresar);

//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",auth.verificarAdmin,usuarioController.actualizar);

//.com/api/firma/registrar
router.patch("/actualizarfirma",auth.verificarAdmin,usuarioController.actualizarfirma);
//.com/api/firma/buscar
 router.get("/buscarfirma" ,auth.verificarAdmin,usuarioController.buscarfirma); 

module.exports = router;