const express = require('express');
const multer = require('multer');
const router = express.Router();

const s3Controller = require('../../../controllers/s3Controller');
const reporteController = require('../../../controllers/reporteController');
const equipoController = require('../../../controllers/equipoController');
const refequipoController = require('../../../controllers/refequipoController');
const auth = require('../../middleware/auth');
const attachPrisma = require('../../middleware/attachPrisma');
const { validarArchivo, TAMANO_MAX } = require('../../middleware/validarArchivo');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: TAMANO_MAX },
});

// Wrapper que convierte errores de multer (ej. LIMIT_FILE_SIZE) en respuestas JSON
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo excede el tamaño máximo de 10 MB.' });
    }
    return res.status(400).json({ error: `Error al procesar el archivo: ${err.message}` });
  });
}

router.use(attachPrisma);

router.post(
  '/guardar',
  handleUpload,
  auth.verificarUsuario,
  validarArchivo,
  s3Controller.guardarreporte,
  reporteController.registrarexterno,
  equipoController.registrarreporteexterno,
  (req, res) => {
    res.status(201).json({
      message: 'Archivo guardado y reporte externo creados correctamente',
      id: req.idcreada,
    });
  }
);

router.post(
  '/guardardocumento',
  handleUpload,
  auth.verificarUsuario,
  validarArchivo,
  s3Controller.guardardocumentoequipo,
  equipoController.registrardocumento,
  (req, res) => {
    res.status(201).json({ message: 'Documento guardado y asociado al equipo' });
  }
);

router.post(
  '/guardardocumentoreferencia',
  handleUpload,
  auth.verificarUsuario,
  validarArchivo,
  s3Controller.guardardocumentoequipo,
  refequipoController.registrardocumento,
  (req, res) => {
    res.status(201).json({ message: 'Documento guardado y asociado a la referencia' });
  }
);

router.post(
  '/guardarsoporte',
  handleUpload,
  auth.verificarUsuario,
  validarArchivo,
  s3Controller.guardarsoporteservicio,
  reporteController.crearDocumentoSoporte,
  (req, res) => {
    res.status(201).json({ message: 'Documento de soporte guardado correctamente' });
  }
);

router.patch('/documentolegal/:id/eliminar', auth.verificarAdminCot, equipoController.eliminarDocumentoLegal);

router.get('/buscar', auth.verificarUsuario, s3Controller.buscar);
router.post('/buscarurl', auth.verificarUsuario, s3Controller.buscarurl);

module.exports = router;
