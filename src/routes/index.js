//Manejador de rutas

const express = require("express");
const router = express.Router();

//Importo las rutas
const userRouter = require('./api/usuarioRoute');

const clienteRouter = require('./api/clienteRoute');

const refequipoRouter = require('./api/refequipoRoute');;

const equipoRouter = require('./api/equipoRoute')

const reporteRouter = require('./api/reporteRoute');

const s3Router = require('./api/s3Route');

 const ordenRouter = require('./api/ingresoRoute');

const whatsappRouter = require('./api/whatsappRoute');

const borradorRouter = require('./api/borradorRoute');


//Asocio el siguiente slash a api
//Queda así
router.use("/usuario", userRouter); //api/usuario

router.use("/cliente", clienteRouter);//api/cliente

router.use("/refequipo", refequipoRouter);//api/refequipo

router.use("/equipo", equipoRouter);//api/equipo

router.use("/reporte", reporteRouter);//api/reporte

router.use("/s3", s3Router);//api/s3 

 router.use("/ingreso", ordenRouter);//api/ingreso

router.use("/whatsapp", whatsappRouter);//api/whatsapp/webhook

router.use("/borrador", borradorRouter);//api/borrador


module.exports = router;