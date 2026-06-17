const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../../controllers/configuracionController');
const validate = require('../../middleware/validate');
const { actualizarGlobalSchema, actualizarConfiguracionSchema, guardarConfiguracionBulkSchema } = require('../../schemas/configuracion.schema');

router.get('/novedades', ctrl.obtenerNovedades);
router.get('/notificaciones/global', auth.verificarAdmin, ctrl.obtenerGlobal);
router.put('/notificaciones/global', auth.verificarAdmin, validate(actualizarGlobalSchema), ctrl.actualizarGlobal);
router.get('/notificaciones', auth.verificarAdmin, ctrl.obtenerConfiguracion);
router.post('/notificaciones/bulk', auth.verificarAdmin, validate(guardarConfiguracionBulkSchema), ctrl.guardarConfiguracionBulk);
router.put('/notificaciones', auth.verificarAdmin, validate(actualizarConfiguracionSchema), ctrl.actualizarConfiguracion);

module.exports = router;
