const router = require('express').Router()

const reporteController = require('../../../controllers/reporteController')
const equipoController = require('../../../controllers/equipoController')
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

//Hasta este punto ya vamos en api/usuario ya comenzamos a
// manejar los metodos


// Ruta pública (no requiere token ni cliente Prisma)

// A partir de aquí, se requiere token y se adjunta cliente Prisma
router.use(attachPrisma);
//.com/api/usuario/listar
router.get("/listar",auth.verificarUsuario,reporteController.listar);

router.get("/listaruno/:id",auth.verificarUsuario,reporteController.listaruno);

//.com/api/usuario/register
router.post("/registrar",auth.verificarAdminSopCom,reporteController.registrar ,equipoController.registrarreporte );

//.com/api/reporte/registrarexterno
router.post("/registrarexterno",auth.verificarAdminSopCom,reporteController.registrarexterno);

//.com/api/usuario/actualizar/id del elemento de la colección que quiero modificar
router.patch("/actualizar/:id",auth.verificarAdminSopCom,reporteController.actualizar);

module.exports = router;