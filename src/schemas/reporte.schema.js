const { z } = require('zod');

const reporteInternoSchema = z.object({
  duracion: z.string().optional().nullable(),
  tipodeasistencia: z.string().min(1, 'Tipo de asistencia requerido'),
  fechadeinicio: z.string().min(1, 'Fecha de inicio requerida'),
  fechadefinalizacion: z.string().optional().nullable(),
  infoequipo: z.union([z.string(), z.number()]).optional().nullable(),
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
});

// Para la ruta registrarexterno el campo reporte llega como JSON string (multipart)
const registrarExternoSchema = z.object({
  reporte: z.string().min(1, 'Datos del reporte requeridos'),
});

const actualizarSchema = reporteInternoSchema.partial();

module.exports = { registrarSchema, registrarExternoSchema, actualizarSchema };
