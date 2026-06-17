const { z } = require('zod');

const registrarSchema = z.object({
  nuevoequipo: z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    marca: z.string().optional().nullable(),
    serie: z.string().optional().nullable(),
    placaDeInventario: z.string().optional().nullable(),
    tipoDeContrato: z.string().optional().nullable(),
    estado: z.string().optional().nullable(),
    ubicacionNombre: z.string().optional().nullable(),
    ubicacionDireccion: z.string().optional().nullable(),
    fechaDeMovimiento: z.string().optional().nullable(),
    id: z.coerce.number({ required_error: 'ID de referencia requerido' }),
    propietario: z.object({ id: z.coerce.number() }).optional().nullable(),
    cliente: z.object({ id: z.coerce.number() }).optional().nullable(),
    proveedor: z.object({ id: z.coerce.number() }).optional().nullable(),
  }),
});

const actualizarSchema = z.object({
  ubicacionNombre: z.string().optional().nullable(),
  ubicacionDireccion: z.string().optional().nullable(),
  clienteId: z.coerce.number().optional().nullable(),
  propietarioId: z.coerce.number().optional().nullable(),
  placaDeInventario: z.string().optional().nullable(),
  tipoDeContrato: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  proveedorId: z.coerce.number().optional().nullable(),
});

const actualizarEstadoSchema = z.object({
  nuevoEstado: z.string().min(1, 'El nuevo estado es requerido'),
});

const buscarEquiposSchema = z.object({
  texto: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const actualizarCronogramaSchema = z.object({
  id_equipo: z.coerce.number({ required_error: 'ID de equipo requerido' }),
  fechaDePreventivo: z.string().min(1, 'Fecha de preventivo requerida'),
});

module.exports = {
  registrarSchema,
  actualizarSchema,
  actualizarEstadoSchema,
  buscarEquiposSchema,
  actualizarCronogramaSchema,
};
