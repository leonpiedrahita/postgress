const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Configuración del cliente S3
const s3 = new S3Client({
  region: process.env.REGION_BUCKET,
  credentials: {
    accessKeyId: process.env.AWS_CLAVE_ACCESO,
    secretAccessKey: process.env.AWS_CLAVE_ACCESO_ESPECIAL,
  },
});

const MIMETYPES_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];
const TAMANO_MAX = 10 * 1024 * 1024; // 10 MB

function validarArchivo(file) {
  if (!MIMETYPES_PERMITIDOS.includes(file.mimetype))
    return 'Tipo de archivo no permitido. Solo PDF, JPG o PNG.';
  if (file.size > TAMANO_MAX)
    return 'El archivo excede el tamaño máximo de 10 MB.';
  return null;
}

function validarFileKey(key) {
  if (typeof key !== 'string' || !key.trim()) return false;
  if (key.includes('..') || key.startsWith('/') || key.includes('\0')) return false;
  return true;
}

// ✅ Subir archivo a S3
const guardarreporte = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún archivo." });
    }
    const errArchivo = validarArchivo(req.file);
    if (errArchivo) return res.status(400).json({ error: errArchivo });

    let parsed;
    try { parsed = JSON.parse(req.body.reporte); } catch {
      return res.status(400).json({ error: 'El campo reporte no es JSON válido.' });
    }
    const seriereporte = parsed?.infoequipo?.serie;
    if (!seriereporte) return res.status(400).json({ error: 'Falta la serie del equipo en el reporte.' });

    const ahora = Date.now();
    const uploadParams = {
      Bucket: process.env.NOMBRE_BUCKET,
      Key: `${seriereporte}-${ahora}-${req.file.originalname}`,
      Body: req.file.buffer,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    
    // Pasar la llave al siguiente middleware
    res.locals.llave = uploadParams.Key;
    // Continuar con el siguiente middleware
    next();

  } catch (err) {
    res.status(422).json({ error: err.message });
  }
};
const guardardocumentoequipo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún archivo." });
    }
    const errArchivo = validarArchivo(req.file);
    if (errArchivo) return res.status(400).json({ error: errArchivo });

    let serieequipo, nombredocumento;
    try { serieequipo = JSON.parse(req.body.serie); } catch {
      return res.status(400).json({ error: 'El campo serie no es válido.' });
    }
    try { nombredocumento = JSON.parse(req.body.nombredocumento); } catch {
      return res.status(400).json({ error: 'El campo nombredocumento no es válido.' });
    }
    if (!serieequipo || !nombredocumento)
      return res.status(400).json({ error: 'Faltan campos requeridos: serie o nombredocumento.' });

    const ahora = Date.now();

    const uploadParams = {
      Bucket: process.env.NOMBRE_BUCKET,
      Key: `${serieequipo}-${nombredocumento}-${ahora}-${req.file.originalname}`,
      Body: req.file.buffer,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    
    // Pasar la llave al siguiente middleware
    res.locals.llave = uploadParams.Key;

    // Continuar con el siguiente middleware
    next();

  } catch (err) {
    res.status(422).json({ error: err.message });
  }
};

const guardarsoporteservicio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún archivo." });
    }
    const errArchivo = validarArchivo(req.file);
    if (errArchivo) return res.status(400).json({ error: errArchivo });

    let serieequipo, nombredocumento;
    try { serieequipo = JSON.parse(req.body.serie); } catch {
      return res.status(400).json({ error: 'El campo serie no es válido.' });
    }
    try { nombredocumento = JSON.parse(req.body.nombredocumento); } catch {
      return res.status(400).json({ error: 'El campo nombredocumento no es válido.' });
    }
    if (!serieequipo || !nombredocumento)
      return res.status(400).json({ error: 'Faltan campos requeridos: serie o nombredocumento.' });

    const ahora = Date.now();

    const uploadParams = {
      Bucket: process.env.NOMBRE_BUCKET,
      Key: `${serieequipo}-${nombredocumento}-${ahora}-${req.file.originalname}`,
      Body: req.file.buffer,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    
    // Pasar la llave al siguiente middleware
    res.locals.llave = uploadParams.Key;

    // Continuar con el siguiente middleware
    next();

  } catch (err) {
    res.status(422).json({ error: err.message });
  }
};
// ✅ Descargar archivo desde S3
const buscar = async (req, res) => {
  try {
    const { fileKey } = req.body;

    if (!fileKey) {
      return res.status(400).json({ error: "No se proporcionó la clave del archivo (fileKey)." });
    }
    if (!validarFileKey(fileKey)) {
      return res.status(400).json({ error: "Clave de archivo inválida." });
    }

    const downloadParams = {
      Bucket: process.env.NOMBRE_BUCKET,
      Key: fileKey,
    };

    const { Body } = await s3.send(new GetObjectCommand(downloadParams));

    const downloadsDir = path.join(__dirname, "downloads");
    const filePath = path.join(downloadsDir, path.basename(fileKey));

    // Asegurar que la carpeta "downloads" existe
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir);
    }

    const fileStream = fs.createWriteStream(filePath);

    Body.pipe(fileStream)
      .on("error", (err) => {
        console.error("Error en la descarga:", err);
        return res.status(500).json({ error: "Error al guardar el archivo localmente." });
      })
      .on("close", () => {
        res.status(200).json({ message: "Archivo descargado correctamente", filePath });
      });

  } catch (err) {
    console.error("Error al buscar archivo:", err);
    res.status(422).json({ error: err.message });
  }
};

// ✅ Obtener URL firmada de S3
const buscarurl = async (req, res) => {
  try {
    const { fileKey } = req.body;
    if (!fileKey) {
      return res.status(400).json({ error: "No se proporcionó la clave del archivo (fileKey)." });
    }
    if (!validarFileKey(fileKey)) {
      return res.status(400).json({ error: "Clave de archivo inválida." });
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.NOMBRE_BUCKET,
        Key: fileKey,
      }),
      { expiresIn: 30 } // Expira en 30 segundos
    );

    res.status(200).json({ message: "URL generada correctamente", url });
  } catch (err) {
    console.error("Error al generar URL firmada:", err);
    res.status(422).json({ error: err.message });
  }
};

module.exports = { guardarreporte,guardardocumentoequipo,guardarsoporteservicio, buscar, buscarurl };
