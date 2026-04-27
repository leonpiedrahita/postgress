const router = require('express').Router();
const estadisticasController = require('../../../controllers/estadisticasController');
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

router.use(attachPrisma);

// GET /api/estadisticas/resumen
router.get('/resumen', auth.verificarUsuario, estadisticasController.resumen);

module.exports = router;
