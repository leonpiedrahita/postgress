const router = require('express').Router()
const usuarioController = require('../../../controllers/usuarioController')

//Hasta este punto ya vamos en api/usuario ya comenzamos a
// manejar los metodos

//.com/api/usuario/listar
router.get("/listar"/* ,auth.verificarVendedor */,usuarioController.listar);

//.com/api/usuario/register
router.post("/registrar",usuarioController.registrar);

//.com/api/usuario/ingresar
router.post("/ingresar",usuarioController.ingresar);

//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",usuarioController.actualizar);

//.com/api/firma/registrar
router.patch("/actualizarfirma"/* ,auth.verificarAdministrador */,usuarioController.actualizarfirma);
//.com/api/firma/buscar
 router.get("/buscarfirma" ,usuarioController.buscarfirma); 

module.exports = router;