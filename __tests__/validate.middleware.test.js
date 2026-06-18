const { z } = require('zod');
const validate = require('../src/middleware/validate');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe('validate middleware', () => {
  const schema = z.object({ nombre: z.string().min(1, 'Nombre requerido') });

  it('llama next() y reemplaza req.body cuando el esquema es válido', () => {
    const req = { body: { nombre: 'Architect i1000' } };
    const res = mockRes();
    validate(schema)(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ nombre: 'Architect i1000' });
  });

  // Regresión: ZodError en Zod v4 expone `.issues`, no `.errors`. Si el middleware
  // usa la propiedad equivocada, esto lanza un TypeError en vez de responder 400.
  it('retorna 400 con detalles por campo cuando la validación falla (no debe lanzar)', () => {
    const req = { body: {} };
    const res = mockRes();

    expect(() => validate(schema)(req, res, mockNext)).not.toThrow();

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Datos de entrada inválidos',
        detalles: expect.arrayContaining([
          expect.objectContaining({ campo: 'nombre' }),
        ]),
      })
    );
  });
});
