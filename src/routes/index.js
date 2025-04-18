//Manejador de rutas

const express = require("express");
const router = express.Router();

//Importo las rutas
const userRouter = require('./api/usuarioRoute');
const clienteRouter = require('./api/clienteRoute');
/* const equipoRouter = require('./api/equipos');
const refequipoRouter = require('./api/refequipos');
const reporteRouter = require('./api/reportes');
const firmaRouter = require('./api/firmas');
const ordenRouter = require('./api/ordenes');
const s3sRouter = require('./api/s3s'); */


//Asocio el siguiente slash a api
//Queda así
router.use("/usuario", userRouter); //api/usuario
router.use("/cliente", clienteRouter);//api/cliente
/* router.use("/equipo", equipoRouter);//api/equipo
router.use("/refequipo", refequipoRouter);//api/refequipo
router.use("/reporte", reporteRouter);//api/reporte
router.use("/firma", firmaRouter);//api/firma
router.use("/orden", ordenRouter);//api/orden
router.use("/s3", s3sRouter);//api/s3 */


module.exports = router;