const { z } = require('zod');

const registrarIngresoSchema = z.object({
  equipo: z.object({
    id: z.coerce.number({ required_error: 'ID de equipo requerido' }),
  }),
  etapa: z.object({
    etapaSeleccionada: z.string().min(1, 'Etapa seleccionada requerida'),
    ubicacionEtapaSeleccionada: z.string().min(1, 'Ubicación de etapa requerida'),
    comentario: z.string().optional().nullable(),
    nombre: z.string().min(1, 'Nombre de etapa requerido'),
    responsable: z.string().optional().nullable(),
    fecha: z.string().min(1, 'Fecha requerida'),
    ubicacion: z.string().min(1, 'Ubicación requerida'),
  }),
});

const agregarEtapaSchema = z.object({
  nombre: z.string().min(1, 'Nombre de etapa requerido'),
  comentario: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  fecha: z.string().min(1, 'Fecha requerida'),
  ubicacion: z.string().min(1, 'Ubicación requerida'),
  etapaActual: z.string().optional().nullable(),
  ultimaEtapa: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  nuevoestadoequipo: z.string().optional().nullable(),
});

module.exports = { registrarIngresoSchema, agregarEtapaSchema };
