const router = require('express').Router()

const ingresoController = require('../../../controllers/ingresoController')

// Rutas para listar los ingresos
router.get('/ingresos', ingresoController.listarTodosLosIngresos);
router.get('/estado/:estado', ingresoController.listarIngresosPorEstado);
router.get('/serie/:serie', ingresoController.listarIngresosPorSerieDeEquipo);
router.get('/cliente/:nombreCliente', ingresoController.listarIngresosPorNombreDeCliente);
router.get('/ingresoid/:ingresoId', ingresoController.obtenerIngresoPorId);

// Ruta para registrar un nuevo ingreso
router.post('/registrar', ingresoController.registrarIngreso);

// Ruta para agregar una etapa a un ingreso
router.post('/agregaretapa/:ingresoId', ingresoController.agregarEtapa);

module.exports = router;