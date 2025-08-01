const router = require('express').Router()
const clienteController = require('../../../controllers/clienteController')
const auth = require('../../middleware/auth');

//Hasta este punto ya vamos en api/usuario ya comenzamos a
// manejar los metodos

//.com/api/cliente/listar
router.get("/listar" ,auth.verificarUsuario, clienteController.listar);
//.com/api/cliente/registrar
router.post("/registrar",auth.verificarAdminCot, clienteController.registrar);
//.com/api/cliente/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",auth.verificarAdminCot, clienteController.actualizar);
//.com/api/cliente/agregarsede/:id
router.post("/agregarsede/:id",auth.verificarAdminCot, clienteController.agregarsede);
//.com/api/cliente/agregarsede/:id
router.patch("/eliminarsede/",auth.verificarAdminCot, clienteController.eliminarsede,);

module.exports = router;