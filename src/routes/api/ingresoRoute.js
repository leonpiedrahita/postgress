const router = require('express').Router()
const ingresoController = require('../../../controllers/ingresoController')
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');
const validate = require('../../middleware/validate');
const { registrarIngresoSchema, agregarEtapaSchema } = require('../../schemas/ingreso.schema');


// Ruta pública (no requiere token ni cliente Prisma)

// A partir de aquí, se requiere token y se adjunta cliente Prisma
router.use(attachPrisma);
// Rutas para listar los ingresos
router.get('/ingresos',auth.verificarUsuarioLum, ingresoController.listarTodosLosIngresos);
router.get('/ingresosabiertos',auth.verificarUsuarioLum, ingresoController.listarIngresosAbiertos);
router.get('/estado/:estado',auth.verificarUsuarioLum, ingresoController.listarIngresosPorEstado);
router.get('/serie/:serie',auth.verificarUsuarioLum, ingresoController.listarIngresosPorSerieDeEquipo);
router.get('/cliente/:nombreCliente',auth.verificarUsuarioLum, ingresoController.listarIngresosPorNombreDeCliente);
router.get('/ingresoid/:ingresoId',auth.verificarUsuarioLum, ingresoController.obtenerIngresoPorId);

// Ruta para registrar un nuevo ingreso
router.post('/registrar',auth.verificarUsuarioLum, validate(registrarIngresoSchema), ingresoController.registrarIngreso);

// Ruta para agregar una etapa a un ingreso
router.post('/agregaretapa/:ingresoId', auth.verificarUsuarioLum, validate(agregarEtapaSchema), ingresoController.agregarEtapa);

// Confirmación de movimiento físico de equipo
router.patch('/confirmar/:ingresoId/etapa/:etapaId', auth.verificarConfirmadores, ingresoController.confirmarMovimiento);

// Movimientos pendientes de confirmación (badge + listado) — visible para todos los roles
router.get('/movimientos/pendientes/count', auth.verificarUsuarioLum, ingresoController.contarMovimientosPendientes);
router.get('/movimientos/pendientes', auth.verificarUsuarioLum, ingresoController.listarMovimientosPendientes);

// Ingresos de un equipo específico
// router.get('/equipo/:equipoId', auth.verificarUsuarioLum, ingresoController.listarPorEquipo);

// Cerrar un ingreso
// router.patch('/cerrar/:ingresoId', auth.verificarUsuarioLum, ingresoController.cerrar);

module.exports = router;