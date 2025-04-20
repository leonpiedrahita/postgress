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

/* const ordenRouter = require('./api/ordenesRoute'); */

 


//Asocio el siguiente slash a api
//Queda así
router.use("/usuario", userRouter); //api/usuario

router.use("/cliente", clienteRouter);//api/cliente

router.use("/refequipo", refequipoRouter);//api/refequipo

router.use("/equipo", equipoRouter);//api/equipo

router.use("/reporte", reporteRouter);//api/reporte

router.use("/s3", s3Router);//api/s3 

/* router.use("/orden", ordenRouter);//api/orden */




module.exports = router;