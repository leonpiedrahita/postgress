const { ZodError } = require('zod');

/**
 * Middleware factory that validates req.body against a Zod schema.
 * Returns 400 with field-level error details on failure.
 * Replaces req.body with the parsed (stripped + coerced) data on success.
 * @param {import('zod').ZodSchema} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detalles = result.error.errors.map(e => ({
        campo: e.path.join('.') || 'body',
        mensaje: e.message,
      }));
      return res.status(400).json({ error: 'Datos de entrada inválidos', detalles });
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
