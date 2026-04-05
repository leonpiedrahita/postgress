const router = require('express').Router();
const borradorController = require('../../../controllers/borradorController');
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

router.use(attachPrisma);

// Guardar o actualizar borrador
router.post('/guardar', auth.verificarUsuarioLum, borradorController.guardar);

// Listar borradores del usuario autenticado
router.get('/listar', auth.verificarUsuarioLum, borradorController.listar);

// Obtener borrador por id
router.get('/obtener/:id', auth.verificarUsuarioLum, borradorController.obtener);

// Eliminar borrador
router.delete('/eliminar/:id', auth.verificarUsuarioLum, borradorController.eliminar);

module.exports = router;
