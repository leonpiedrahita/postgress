const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../../controllers/configuracionController');

router.get('/notificaciones', auth.verificarAdmin, ctrl.obtenerConfiguracion);
router.post('/notificaciones/bulk', auth.verificarAdmin, ctrl.guardarConfiguracionBulk);
router.put('/notificaciones', auth.verificarAdmin, ctrl.actualizarConfiguracion);

module.exports = router;
