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

// ✅ Subir archivo a S3
const guardarreporte = async (req, res, next) => {
  try {
    const ahora = Date.now();
    const seriereporte = (JSON.parse(req.body.reporte)).infoequipo.serie;
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún archivo." });
    }

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
    const ahora = Date.now();
    const serieequipo = (JSON.parse(req.body.serie));
    const nombredocumento = JSON.parse(req.body.nombredocumento) ;
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún archivo." });
    }

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

    const downloadParams = {
      Bucket: process.env.NOMBRE_BUCKET,
      Key: fileKey,
    };

    const { Body } = await s3.send(new GetObjectCommand(downloadParams));

    const downloadsDir = path.join(__dirname, "downloads");
    const filePath = path.join(downloadsDir, fileKey);

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

module.exports = { guardarreporte,guardardocumentoequipo, buscar, buscarurl };
