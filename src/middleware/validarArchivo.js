const path = require('path');

const TAMANO_MAX = 10 * 1024 * 1024;        // 10 MB  (uso general)
const TAMANO_MAX_GRANDE = 100 * 1024 * 1024; // 100 MB (manuales y brochures)

// MIME type → extensiones válidas
const TIPOS_PERMITIDOS = {
  'application/pdf':                                                           ['.pdf'],
  'image/jpeg':                                                                ['.jpg', '.jpeg'],
  'image/png':                                                                 ['.png'],
  'image/gif':                                                                 ['.gif'],
  'image/webp':                                                                ['.webp'],
  'image/tiff':                                                                ['.tif', '.tiff'],
  'application/msword':                                                        ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   ['.docx'],
  'application/vnd.ms-excel':                                                  ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':         ['.xlsx'],
  'application/vnd.ms-powerpoint':                                             ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

// Firmas de bytes mágicos (offset 0 salvo que se indique)
const FIRMAS = {
  'application/pdf':    { firmas: [[0x25, 0x50, 0x44, 0x46]] },                // %PDF
  'image/jpeg':         { firmas: [[0xFF, 0xD8, 0xFF]] },
  'image/png':          { firmas: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]] },
  'image/gif':          { firmas: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61],       // GIF87a
                                   [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]] },    // GIF89a
  'image/tiff':         { firmas: [[0x49, 0x49, 0x2A, 0x00],                   // LE
                                   [0x4D, 0x4D, 0x00, 0x2A]] },                // BE
  // OOXML (.docx, .xlsx, .pptx) son archivos ZIP
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   { firmas: [[0x50, 0x4B, 0x03, 0x04]] },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':         { firmas: [[0x50, 0x4B, 0x03, 0x04]] },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { firmas: [[0x50, 0x4B, 0x03, 0x04]] },
  // OLE2 (.doc, .xls, .ppt)
  'application/msword':           { firmas: [[0xD0, 0xCF, 0x11, 0xE0]] },
  'application/vnd.ms-excel':     { firmas: [[0xD0, 0xCF, 0x11, 0xE0]] },
  'application/vnd.ms-powerpoint':{ firmas: [[0xD0, 0xCF, 0x11, 0xE0]] },
  // WEBP: RIFF en bytes 0-3, WEBP en bytes 8-11
  'image/webp': { webp: true },
};

function verificarMagicBytes(mime, buffer) {
  const entrada = FIRMAS[mime];
  if (!entrada) return true; // tipo sin firma definida, se acepta sin importar el buffer
  if (!buffer || buffer.length < 4) return false; // firma conocida pero sin buffer: rechazar

  if (entrada.webp) {
    if (buffer.length < 12) return false;
    return (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50   // WEBP
    );
  }

  return entrada.firmas.some(firma => firma.every((byte, i) => buffer[i] === byte));
}

/**
 * Crea un middleware Express que valida tipo MIME, extensión, tamaño y bytes mágicos
 * del archivo subido por multer (memoryStorage).
 * Debe ejecutarse después de upload.single() y antes del controller.
 */
function crearValidadorArchivo(tamanoMax) {
  const mbLabel = Math.round(tamanoMax / (1024 * 1024));
  return function validarArchivo(req, res, next) {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado un archivo.' });
    }

    const { mimetype, originalname, size, buffer } = req.file;

    // 1. MIME type en la lista permitida
    if (!TIPOS_PERMITIDOS[mimetype]) {
      return res.status(415).json({
        error: 'Tipo de archivo no permitido.',
        permitidos: Object.keys(TIPOS_PERMITIDOS),
      });
    }

    // 2. Extensión coherente con el MIME type declarado
    const ext = path.extname(originalname).toLowerCase();
    if (!ext) {
      return res.status(415).json({ error: 'El archivo debe tener extensión.' });
    }
    if (!TIPOS_PERMITIDOS[mimetype].includes(ext)) {
      return res.status(415).json({
        error: `La extensión "${ext}" no corresponde al tipo "${mimetype}".`,
      });
    }

    // 3. Tamaño máximo (respaldo al límite configurado en multer)
    if (size > tamanoMax) {
      return res.status(413).json({ error: `El archivo excede el tamaño máximo de ${mbLabel} MB.` });
    }

    // 4. Bytes mágicos — verifica el contenido real del buffer
    if (!verificarMagicBytes(mimetype, buffer)) {
      return res.status(415).json({
        error: 'El contenido del archivo no coincide con su tipo declarado.',
      });
    }

    next();
  };
}

const validarArchivo = crearValidadorArchivo(TAMANO_MAX);
const validarArchivoGrande = crearValidadorArchivo(TAMANO_MAX_GRANDE);

module.exports = { validarArchivo, validarArchivoGrande, TIPOS_PERMITIDOS, TAMANO_MAX, TAMANO_MAX_GRANDE, verificarMagicBytes };
