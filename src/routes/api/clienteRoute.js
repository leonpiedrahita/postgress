const router = require('express').Router()
const clienteController = require('../../../controllers/clienteController')

const prisma = require('../../middleware/prisma-audit-extension.js'); // Ajusta la ruta según tu estructura




//Hasta este punto ya vamos en api/usuario ya comenzamos a
// manejar los metodos

//.com/api/cliente/listar
router.get("/listar"/* ,auth.verificarAdministrador */,clienteController.listar);
//.com/api/cliente/registrar
router.post("/registrar",clienteController.registrar);
//.com/api/cliente/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",clienteController.actualizar);
//.com/api/cliente/agregarsede/:id
router.patch("/agregarsede/:id",clienteController.agregarsede);
//.com/api/cliente/agregarsede/:id
router.patch("/eliminarsede/",clienteController.eliminarsede,);

module.exports = router;