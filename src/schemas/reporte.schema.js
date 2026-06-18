const { z } = require('zod');

const reporteInternoSchema = z.object({
  // El FRONT lo maneja como número cuando se ajusta con los botones +/- y como
  // string cuando se escribe directamente (changeDuration en FormularioGenerarOrden).
  duracion: z.union([z.string(), z.number()]).optional().nullable(),
  tipodeasistencia: z.string().min(1, 'Tipo de asistencia requerido'),
  fechadeinicio: z.string().min(1, 'Fecha de inicio requerida'),
  fechadefinalizacion: z.string().optional().nullable(),
  // Prisma lo guarda como Json; en la práctica el FRONT envía un objeto
  // { nombre, serie, marca }, así que se acepta cualquier valor serializable.
  infoequipo: z.any().optional().nullable(),
  propietario: z.string().optional().nullable(),
  nombrecliente: z.string().optional().nullable(),
  nitcliente: z.string().optional().nullable(),
  sedecliente: z.string().optional().nullable(),
  direccioncliente: z.string().optional().nullable(),
  profesionalcliente: z.string().optional().nullable(),
  telefonocliente: z.string().optional().nullable(),
  hallazgos: z.string().optional().nullable(),
  actividades: z.string().optional().nullable(),
  pruebas: z.string().optional().nullable(),
  repuestos: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  firmacliente: z.string().optional().nullable(),
  firmaingeniero: z.string().optional().nullable(),
  ingeniero: z.string().optional().nullable(),
});

const registrarSchema = z.object({
  reporte: reporteInternoSchema,
  id_equipo: z.coerce.number({ required_error: 'ID de equipo requerido' }),
});

// Para la ruta registrarexterno el campo reporte llega como JSON string (multipart)
const registrarExternoSchema = z.object({
  reporte: z.string().min(1, 'Datos del reporte requeridos'),
});

const actualizarSchema = reporteInternoSchema.partial();

module.exports = { registrarSchema, registrarExternoSchema, actualizarSchema };
