jest.mock('axios');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance),
}));

const axios = require('axios');

// El mock de Prisma debe existir antes de requerir el servicio
const mockPrismaInstance = {
  ingreso: { findUnique: jest.fn() },
  equipo: { findUnique: jest.fn() },
  usuario: { findMany: jest.fn() },
};

const {
  enviarPlantilla,
  enviarMensajeTexto,
  notificarIngresoEquipo,
  notificarCambioEtapa,
} = require('../services/whatsappService');

const NUMERO_VALIDO = '+573001234567';
const NUMERO_INVALIDO = '3001234567';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.WHATSAPP_TOKEN = 'fake-token';
  process.env.WHATSAPP_PHONE_ID = '1234567890';
  process.env.WHATSAPP_VERSION = 'v19.0';
});

// ─── enviarPlantilla ──────────────────────────────────────────────────────────

describe('enviarPlantilla', () => {
  it('envía la petición correctamente con número E.164 válido', async () => {
    axios.post.mockResolvedValue({ data: { messages: [{ id: 'msg-1' }] } });

    const result = await enviarPlantilla(NUMERO_VALIDO, 'gomaint_nuevo_ingreso', 'es_CO', []);

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = axios.post.mock.calls[0];
    expect(url).toContain('/messages');
    expect(body.to).toBe(NUMERO_VALIDO);
    expect(body.template.name).toBe('gomaint_nuevo_ingreso');
    expect(config.headers.Authorization).toBe('Bearer fake-token');
    expect(result).toEqual({ messages: [{ id: 'msg-1' }] });
  });

  it('retorna null y loguea advertencia si el número no es E.164', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await enviarPlantilla(NUMERO_INVALIDO, 'gomaint_nuevo_ingreso', 'es_CO', []);

    expect(axios.post).not.toHaveBeenCalled();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no E.164'));
    warnSpy.mockRestore();
  });

  it('retorna null y loguea error si la API falla', async () => {
    axios.post.mockRejectedValue({ message: 'Network Error', response: { data: { error: 'bad request' } } });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await enviarPlantilla(NUMERO_VALIDO, 'gomaint_nuevo_ingreso', 'es_CO', []);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// ─── enviarMensajeTexto ───────────────────────────────────────────────────────

describe('enviarMensajeTexto', () => {
  it('envía mensaje de texto correctamente', async () => {
    axios.post.mockResolvedValue({ data: { messages: [{ id: 'msg-2' }] } });

    const result = await enviarMensajeTexto(NUMERO_VALIDO, 'Hola, tu equipo está listo.');

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [, body] = axios.post.mock.calls[0];
    expect(body.type).toBe('text');
    expect(body.text.body).toBe('Hola, tu equipo está listo.');
    expect(result).toEqual({ messages: [{ id: 'msg-2' }] });
  });

  it('retorna null con número inválido', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await enviarMensajeTexto(NUMERO_INVALIDO, 'Mensaje');
    expect(result).toBeNull();
  });
});

// ─── notificarIngresoEquipo ───────────────────────────────────────────────────

describe('notificarIngresoEquipo', () => {
  const ingresoMock = {
    id: 1,
    createdAt: new Date('2024-01-15'),
    equipo: {
      nombre: 'Monitor Multiparámetros',
      serie: 'SN-001',
      cliente: { nombre: 'Clínica Central' },
    },
    etapas: [{ comentario: 'Pantalla dañada' }],
  };

  const usuariosMock = [
    { nombre: 'Ana López', telefono: '+573001111111' },
    { nombre: 'Carlos Ruiz', telefono: '+573002222222' },
  ];

  it('envía plantilla gomaint_nuevo_ingreso a todos los usuarios con teléfono', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    expect(axios.post).toHaveBeenCalledTimes(2);
    const llamadas = axios.post.mock.calls;
    expect(llamadas[0][1].template.name).toBe('gomaint_nuevo_ingreso');
    expect(llamadas[0][1].to).toBe('+573001111111');
    expect(llamadas[1][1].to).toBe('+573002222222');
  });

  it('excluye roles ventas, ingresos y calidad (pero no lumira) de los destinatarios', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    const callArg = mockPrismaInstance.usuario.findMany.mock.calls[0][0];
    expect(callArg.where.rol.notIn).toEqual(expect.arrayContaining(['ventas', 'ingresos', 'calidad']));
    expect(callArg.where.rol.notIn).not.toContain('lumira');
  });

  it('no envía nada si el ingreso no existe', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(null);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarIngresoEquipo(99);

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('no envía nada si no hay usuarios con teléfono', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue([]);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarIngresoEquipo(1);

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('no lanza excepción si Prisma falla', async () => {
    mockPrismaInstance.ingreso.findUnique.mockRejectedValue(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notificarIngresoEquipo(1)).resolves.toBeUndefined();
  });
});

// ─── notificarCambioEtapa ─────────────────────────────────────────────────────

describe('notificarCambioEtapa', () => {
  const ingresoConEquipo = {
    id: 10,
    equipo: {
      nombre: 'Desfibrilador',
      serie: 'DF-007',
      estado: 'En soporte',
      cliente: {
        nombre: 'Hospital Norte',
        sedePrincipal: { ciudad: 'Medellín' },
      },
    },
  };

  const usuariosMock = [{ telefono: '+573005555555' }];

  const datosEtapa = {
    etapaFinalizada: 'Recepción',
    etapaNueva: 'Diagnóstico',
    ubicacion: 'Taller electrónica',
    comentario: 'Revisión de PCB',
    responsable: 'Pedro Técnico',
  };

  it('envía plantilla gomaint_notificacion_estado_y_etapa con los 9 parámetros correctos', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, datosEtapa);

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [, body] = axios.post.mock.calls[0];
    expect(body.template.name).toBe('gomaint_notificacion_estado_y_etapa');
    const params = body.template.components[0].parameters;
    expect(params[0].text).toBe('Hospital Norte');       // {{1}} cliente
    expect(params[1].text).toBe('Desfibrilador - DF-007'); // {{2}} equipo-serie
    expect(params[2].text).toBe('En soporte');           // {{3}} estado equipo
    expect(params[3].text).toBe('Recepción');            // {{4}} etapa finalizada
    expect(params[4].text).toBe('Diagnóstico');          // {{5}} etapa iniciada
    expect(params[5].text).toBe('Taller electrónica');   // {{6}} ubicación
    expect(params[6].text).toBe('Revisión de PCB');      // {{7}} observaciones
    expect(params[7].text).toBe('Pedro Técnico');        // {{8}} responsable
    expect(params[8].text).toBe('Medellín');             // {{9}} ciudad
  });

  it('omite notificación cuando etapaNueva=Finalizado y etapaFinalizada=Despachado', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await notificarCambioEtapa(10, {
      ...datosEtapa,
      etapaFinalizada: 'Despachado',
      etapaNueva: 'Finalizado',
    });

    expect(axios.post).not.toHaveBeenCalled();
    expect(mockPrismaInstance.ingreso.findUnique).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('incluye bodega cuando etapaNueva es Listo para despacho', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, { ...datosEtapa, etapaNueva: 'Listo para despacho' });

    expect(mockPrismaInstance.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          rol: expect.objectContaining({ in: expect.arrayContaining(['bodega']) }),
        }),
      })
    );
  });

  it('incluye bodega cuando etapaNueva es Despachado', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, { ...datosEtapa, etapaNueva: 'Despachado' });

    expect(mockPrismaInstance.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          rol: expect.objectContaining({ in: expect.arrayContaining(['bodega']) }),
        }),
      })
    );
  });

  it('NO incluye bodega en etapas normales', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, datosEtapa);

    const where = mockPrismaInstance.usuario.findMany.mock.calls[0][0].where;
    expect(where.rol.in).not.toContain('bodega');
  });

  it('incluye lumira en etapas normales', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, datosEtapa);

    const where = mockPrismaInstance.usuario.findMany.mock.calls[0][0].where;
    expect(where.rol.in).toContain('lumira');
  });

  it('incluye lumira cuando etapaNueva es Finalizado (etapa previa distinta de Despachado)', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, { ...datosEtapa, etapaNueva: 'Finalizado' });

    const where = mockPrismaInstance.usuario.findMany.mock.calls[0][0].where;
    expect(where.rol.in).toContain('lumira');
  });

  it('no envía nada si el ingreso no existe', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(null);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(notificarCambioEtapa(99, datosEtapa)).resolves.toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('no lanza excepción si Prisma falla', async () => {
    mockPrismaInstance.ingreso.findUnique.mockRejectedValue(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notificarCambioEtapa(10, datosEtapa)).resolves.toBeUndefined();
  });
});
