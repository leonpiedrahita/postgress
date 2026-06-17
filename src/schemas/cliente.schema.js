const { z } = require('zod');

const sedeSchema = z.object({
  ciudad: z.string().min(1, 'Ciudad requerida'),
  direccion: z.string().min(1, 'Dirección requerida'),
  activa: z.boolean().optional().default(true),
});

const registrarSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  nit: z.string().min(1, 'NIT requerido'),
  sedePrincipal: sedeSchema,
});

const actualizarSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido').optional(),
  nit: z.string().min(1, 'NIT requerido').optional(),
  sedePrincipal: sedeSchema.partial().optional(),
});

const agregarSedeSchema = z.object({
  ciudad: z.string().min(1, 'Ciudad requerida'),
  direccion: z.string().min(1, 'Dirección requerida'),
  activa: z.boolean().optional().default(true),
});

module.exports = { registrarSchema, actualizarSchema, agregarSedeSchema };
