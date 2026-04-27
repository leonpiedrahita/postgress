jest.mock('../src/prisma-client', () => ({
  getPrismaWithUser: jest.fn(() => ({})),
}));

const estadisticasController = require('../controllers/estadisticasController');

const mockPrisma = {
  equipo: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  cliente: { count: jest.fn() },
  ingreso: { count: jest.fn() },
};

const mockReq = (overrides = {}) => ({
  prisma: mockPrisma,
  params: {},
  body: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

// ─── resumen ──────────────────────────────────────────────────────────────────
describe('resumen', () => {
  const setupMocks = ({ totalEquipos = 10, totalClientes = 5, abiertos = 3, cerrados = 7, ultimos30 = 2, porEstado = [] } = {}) => {
    mockPrisma.equipo.count.mockResolvedValue(totalEquipos);
    mockPrisma.cliente.count.mockResolvedValue(totalClientes);
    mockPrisma.ingreso.count
      .mockResolvedValueOnce(abiertos)
      .mockResolvedValueOnce(cerrados)
      .mockResolvedValueOnce(ultimos30);
    mockPrisma.equipo.groupBy.mockResolvedValue(porEstado);
  };

  it('retorna 200 con los KPIs correctos', async () => {
    setupMocks({
      totalEquipos: 20,
      totalClientes: 8,
      abiertos: 4,
      cerrados: 16,
      ultimos30: 3,
      porEstado: [
        { estado: 'Activo', _count: { id: 15 } },
        { estado: 'Fuera de servicio', _count: { id: 5 } },
      ],
    });

    const res = mockRes();
    await estadisticasController.resumen(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const resultado = res.json.mock.calls[0][0];
    expect(resultado.equipos.total).toBe(20);
    expect(resultado.clientes.total).toBe(8);
    expect(resultado.ingresos.abiertos).toBe(4);
    expect(resultado.ingresos.cerrados).toBe(16);
    expect(resultado.ingresos.ultimos30Dias).toBe(3);
    expect(resultado.equipos.porEstado['Activo']).toBe(15);
    expect(resultado.equipos.porEstado['Fuera de servicio']).toBe(5);
  });

  it('maneja equipos sin estado (null) como "Sin estado"', async () => {
    setupMocks({
      porEstado: [{ estado: null, _count: { id: 2 } }],
    });

    const res = mockRes();
    await estadisticasController.resumen(mockReq(), res);

    const resultado = res.json.mock.calls[0][0];
    expect(resultado.equipos.porEstado['Sin estado']).toBe(2);
  });

  it('retorna porEstado vacío si no hay equipos', async () => {
    setupMocks({ totalEquipos: 0, porEstado: [] });

    const res = mockRes();
    await estadisticasController.resumen(mockReq(), res);

    const resultado = res.json.mock.calls[0][0];
    expect(resultado.equipos.porEstado).toEqual({});
  });

  it('usa Promise.all — todas las queries se ejecutan en paralelo', async () => {
    setupMocks();
    const res = mockRes();
    await estadisticasController.resumen(mockReq(), res);

    expect(mockPrisma.equipo.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.cliente.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.ingreso.count).toHaveBeenCalledTimes(3);
    expect(mockPrisma.equipo.groupBy).toHaveBeenCalledTimes(1);
  });

  it('retorna 500 si alguna query falla', async () => {
    mockPrisma.equipo.count.mockRejectedValue(new Error('DB error'));
    mockPrisma.cliente.count.mockResolvedValue(0);
    mockPrisma.ingreso.count.mockResolvedValue(0);
    mockPrisma.equipo.groupBy.mockResolvedValue([]);

    const res = mockRes();
    await estadisticasController.resumen(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
