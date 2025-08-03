const express = require('express');
const s3Controller = require('../../../controllers/s3Controller');
const reporteController = require('../../../controllers/reporteController');
const equipoController = require('../../../controllers/equipoController');
const refequipoController = require('../../../controllers/refequipoController');
const multer = require('multer');
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Middleware para verificar si el archivo existe
const validarArchivo = (req, res, next) => {
    /* console.log("file",req.file) */
    /* console.log('Equipo.id',JSON.parse(req.body.id_equipo))
    console.log(typeof(req.body.id_equipo))  */  
    /* console.log("reporte",JSON.parse(req.body.reporte))  */
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha proporcionado un archivo' });
  }
  
    next();  
};

// Ruta pública (no requiere token ni cliente Prisma)

// A partir de aquí, se requiere token y se adjunta cliente Prisma
router.use(attachPrisma);
// Ruta para guardar archivo en S3 y registrar reporte externo
router.post(
    '/guardar',
    upload.single('file'),
    auth.verificarAdminSopCom,
    validarArchivo,
    s3Controller.guardarreporte,
    reporteController.registrarexterno, 
    equipoController.registrarreporteexterno,
    (req, res) => {
      // Responder una sola vez al finalizar todos los middlewares
      res.status(201).json({
        message: 'Archivo guardado y reporte externo creados correctamente',
        id: req.idcreada
      });
    }
  );
  
  // Ruta para guardar archivo en S3 y registrar documento en equipo
  router.post(
    '/guardardocumento',
    upload.single('file'),
    auth.verificarUsuario,
    validarArchivo,
    s3Controller.guardardocumentoequipo, 
    equipoController.registrardocumento,
    (req, res) => {
      // Responder una sola vez al finalizar todos los middlewares
      res.status(201).json({
        message: 'Documento guardado y asociado al equipo',
        
      });
    }
  );

  // Ruta para guardar archivo en S3 y registrar documento en equipo
  router.post(
    '/guardardocumentoreferencia',
    upload.single('file'),
    auth.verificarUsuario,
    validarArchivo,
    s3Controller.guardardocumentoequipo, 
    refequipoController.registrardocumento,
    (req, res) => {
      // Responder una sola vez al finalizar todos los middlewares
      res.status(201).json({
        message: 'Documento guardado y asociado al equipo',
        
      });
    }
  );
// Ruta para guardar archivo en S3 y registrar documento en equipo
  router.post(
    '/guardarsoporte',
    upload.single('file'),
    auth.verificarUsuario,
    validarArchivo,
    s3Controller.guardarsoporteservicio, 
    reporteController.crearDocumentoSoporte,
    (req, res) => {
      // Responder una sola vez al finalizar todos los middlewares
      res.status(201).json({
        message: 'Documento guardado y asociado al equipo',
        
      });
    }
  );

// Buscar objetos en S3
router.get('/buscar',auth.verificarUsuario, s3Controller.buscar);

// Obtener URL de un objeto en S3
router.post('/buscarurl',auth.verificarUsuario, s3Controller.buscarurl);

module.exports = router;
