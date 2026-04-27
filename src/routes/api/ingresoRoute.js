const router = require('express').Router()
const ingresoController = require('../../../controllers/ingresoController')
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');


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
router.post('/registrar',auth.verificarUsuarioLum, ingresoController.registrarIngreso);

// Ruta para agregar una etapa a un ingreso
router.post('/agregaretapa/:ingresoId',auth.verificarUsuarioLum, ingresoController.agregarEtapa);

// Ingresos de un equipo específico
// router.get('/equipo/:equipoId', auth.verificarUsuarioLum, ingresoController.listarPorEquipo);

// Cerrar un ingreso
// router.patch('/cerrar/:ingresoId', auth.verificarUsuarioLum, ingresoController.cerrar);

module.exports = router;