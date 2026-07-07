const { parsePaginacion, LIMITE_MAXIMO } = require('../src/utils/paginacion');

describe('parsePaginacion', () => {
  it('retorna null si no se envían page ni limit (compatibilidad)', () => {
    expect(parsePaginacion({})).toBeNull();
    expect(parsePaginacion()).toBeNull();
    expect(parsePaginacion({ otro: 'param' })).toBeNull();
  });

  it('calcula skip/take con page y limit válidos', () => {
    expect(parsePaginacion({ page: '2', limit: '25' })).toEqual({
      skip: 25,
      take: 25,
      page: 2,
      limit: 25,
    });
  });

  it('page sin limit → limit por defecto 50', () => {
    expect(parsePaginacion({ page: '3' })).toEqual({ skip: 100, take: 50, page: 3, limit: 50 });
  });

  it('limit sin page → page por defecto 1', () => {
    expect(parsePaginacion({ limit: '10' })).toEqual({ skip: 0, take: 10, page: 1, limit: 10 });
  });

  // ─── Casos borde inválidos ────────────────────────────────────────────────
  [
    ['page no numérico', { page: 'abc' }],
    ['page cero', { page: '0' }],
    ['page negativo', { page: '-1' }],
    ['limit no numérico', { limit: 'xyz' }],
    ['limit cero', { limit: '0' }],
    ['limit negativo', { limit: '-5' }],
    ['limit por encima del máximo', { limit: String(LIMITE_MAXIMO + 1) }],
  ].forEach(([desc, query]) => {
    it(`retorna error con ${desc}`, () => {
      expect(parsePaginacion(query)).toEqual({ error: true });
    });
  });

  it('acepta limit en el máximo exacto', () => {
    expect(parsePaginacion({ limit: String(LIMITE_MAXIMO) })).toEqual({
      skip: 0,
      take: LIMITE_MAXIMO,
      page: 1,
      limit: LIMITE_MAXIMO,
    });
  });
});
