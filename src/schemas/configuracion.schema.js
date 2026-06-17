const { z } = require('zod');

const actualizarGlobalSchema = z.object({
  habilitado: z.boolean({ required_error: 'habilitado es requerido', invalid_type_error: 'habilitado debe ser un booleano' }),
});

const actualizarConfiguracionSchema = z.object({
  rol: z.string().min(1, 'rol requerido'),
  tipoNotificacion: z.string().min(1, 'tipoNotificacion requerido'),
  habilitado: z.boolean({ required_error: 'habilitado es requerido', invalid_type_error: 'habilitado debe ser un booleano' }),
});

const guardarConfiguracionBulkSchema = z.object({
  cambios: z.array(
    z.object({
      rol: z.string().min(1, 'rol requerido'),
      tipoNotificacion: z.string().min(1, 'tipoNotificacion requerido'),
      habilitado: z.boolean({ invalid_type_error: 'habilitado debe ser un booleano' }),
    }),
    { required_error: 'cambios es requerido', invalid_type_error: 'cambios debe ser un arreglo' }
  ).min(1, 'Debe incluir al menos un cambio'),
});

module.exports = { actualizarGlobalSchema, actualizarConfiguracionSchema, guardarConfiguracionBulkSchema };
