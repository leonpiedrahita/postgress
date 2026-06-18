const { z } = require('zod');

const camposBase = {
  nombre: z.string().min(1, 'Nombre requerido'),
  marca: z.string().optional().nullable(),
  fabricante: z.string().optional().nullable(),
  servicio: z.string().optional().nullable(),
  clasificacionriesgo: z.string().optional().nullable(),
  periodicidadmantenimiento: z.string().optional().nullable(),
  alto: z.string().optional().nullable(),
  ancho: z.string().optional().nullable(),
  profundo: z.string().optional().nullable(),
  peso: z.string().optional().nullable(),
  voltaje: z.string().optional().nullable(),
  corriente: z.string().optional().nullable(),
  potencia: z.string().optional().nullable(),
  principiodemedicion: z.string().optional().nullable(),
  pruebasporhora: z.string().optional().nullable(),
  temperatura: z.string().optional().nullable(),
  humedad: z.string().optional().nullable(),
  agua: z.string().optional().nullable(),
  desague: z.string().optional().nullable(),
  recomendaciones: z.string().optional().nullable(),
};

const registrarSchema = z.object({
  ...camposBase,
  nombre: z.string().min(1, 'Nombre requerido'),
});

const actualizarSchema = z.object(
  Object.fromEntries(Object.entries(camposBase).map(([k, v]) => [k, v.optional()]))
).refine(data => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo para actualizar' });

module.exports = { registrarSchema, actualizarSchema };
