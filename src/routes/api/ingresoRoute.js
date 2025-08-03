const router = require('express').Router()
const ingresoController = require('../../../controllers/ingresoController')
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');


// Ruta pública (no requiere token ni cliente Prisma)

// A partir de aquí, se requiere token y se adjunta cliente Prisma
router.use(attachPrisma);
// Rutas para listar los ingresos
router.get('/ingresos',auth.verificarUsuario, ingresoController.listarTodosLosIngresos);
router.get('/estado/:estado',auth.verificarUsuario, ingresoController.listarIngresosPorEstado);
router.get('/serie/:serie',auth.verificarUsuario, ingresoController.listarIngresosPorSerieDeEquipo);
router.get('/cliente/:nombreCliente',auth.verificarUsuario, ingresoController.listarIngresosPorNombreDeCliente);
router.get('/ingresoid/:ingresoId',auth.verificarUsuario, ingresoController.obtenerIngresoPorId);

// Ruta para registrar un nuevo ingreso
router.post('/registrar',auth.verificarUsuario, ingresoController.registrarIngreso);

// Ruta para agregar una etapa a un ingreso
router.post('/agregaretapa/:ingresoId',auth.verificarUsuario, ingresoController.agregarEtapa);

module.exports = router;