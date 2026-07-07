// Paginación opcional por query params (?page=1&limit=50).
// - Si la petición NO envía page ni limit, devuelve null → el endpoint responde
//   el array completo (comportamiento histórico, no rompe clientes existentes).
// - Si los envía, devuelve { skip, take, page, limit } para usar con Prisma,
//   o { error: true } si los valores son inválidos.
const LIMITE_MAXIMO = 200;

function parsePaginacion(query = {}) {
  const { page, limit } = query;
  if (page === undefined && limit === undefined) return null;

  const p = parseInt(page ?? '1', 10);
  const l = parseInt(limit ?? '50', 10);

  if (!Number.isInteger(p) || p <= 0 || !Number.isInteger(l) || l <= 0 || l > LIMITE_MAXIMO) {
    return { error: true };
  }

  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

module.exports = { parsePaginacion, LIMITE_MAXIMO };
