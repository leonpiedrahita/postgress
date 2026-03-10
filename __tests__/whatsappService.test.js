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
  notificarEquipoDisponible,
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

  const adminsMock = [
    { nombre: 'Ana López', telefono: '+573001111111' },
    { nombre: 'Carlos Ruiz', telefono: '+573002222222' },
  ];

  it('envía plantilla gomaint_nuevo_ingreso a todos los admins con teléfono', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(adminsMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    expect(axios.post).toHaveBeenCalledTimes(2);
    const llamadas = axios.post.mock.calls;
    expect(llamadas[0][1].template.name).toBe('gomaint_nuevo_ingreso');
    expect(llamadas[0][1].to).toBe('+573001111111');
    expect(llamadas[1][1].to).toBe('+573002222222');
  });

  it('no envía nada si el ingreso no existe', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(null);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarIngresoEquipo(99);

    expect(axios.post).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('no envía nada si no hay admins con teléfono', async () => {
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

// ─── notificarEquipoDisponible ────────────────────────────────────────────────

describe('notificarEquipoDisponible', () => {
  const equipoMock = {
    id: 5,
    nombre: 'Ventilador Mecánico',
    serie: 'VM-202',
    ingresos: [
      { etapas: [{ ubicacion: 'Bodega 1', comentario: 'Calibrado y listo' }] },
    ],
  };

  const usuariosMock = [
    { telefono: '+573003333333' },
    { telefono: '+573004444444' },
  ];

  it('envía plantilla gomaint_equipo_disponible con estado correcto', async () => {
    mockPrismaInstance.equipo.findUnique.mockResolvedValue(equipoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarEquipoDisponible(5, 'Disponible');

    expect(axios.post).toHaveBeenCalledTimes(2);
    const [, body] = axios.post.mock.calls[0];
    expect(body.template.name).toBe('gomaint_equipo_disponible');
    const params = body.template.components[0].parameters;
    expect(params[0].text).toBe('Disponible');
    expect(params[1].text).toBe('Ventilador Mecánico - VM-202');
    expect(params[2].text).toBe('Bodega 1');
  });

  it('no envía nada si el equipo no existe', async () => {
    mockPrismaInstance.equipo.findUnique.mockResolvedValue(null);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarEquipoDisponible(99, 'Disponible');

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('no lanza excepción si Prisma falla', async () => {
    mockPrismaInstance.equipo.findUnique.mockRejectedValue(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notificarEquipoDisponible(5, 'Disponible')).resolves.toBeUndefined();
  });
});

// ─── notificarCambioEtapa ─────────────────────────────────────────────────────

describe('notificarCambioEtapa', () => {
  const ingresoConEquipo = {
    id: 10,
    equipo: {
      nombre: 'Desfibrilador',
      serie: 'DF-007',
      estado: 'En reparación',
      cliente: { nombre: 'Hospital Norte' },
    },
  };

  const usuariosMock = [
    { telefono: '+573005555555' },
  ];

  const datosEtapa = {
    etapaFinalizada: 'Recepción',
    etapaNueva: 'Diagnóstico',
    ubicacion: 'Taller electrónica',
    comentario: 'Revisión de PCB',
    responsable: 'Pedro Técnico',
  };

  it('envía plantilla gomaint_notificacion con todos los parámetros', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, datosEtapa);

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [, body] = axios.post.mock.calls[0];
    expect(body.template.name).toBe('gomaint_notificacion');
    const params = body.template.components[0].parameters;
    expect(params[0].text).toBe('Etapa finalizada: Recepción');
    expect(params[1].text).toBe('Hospital Norte');
    expect(params[2].text).toBe('Desfibrilador - DF-007');
    expect(params[3].text).toBe('Diagnóstico');
    expect(params[4].text).toBe('Taller electrónica');
    expect(params[5].text).toBe('Revisión de PCB');
    expect(params[6].text).toBe('Pedro Técnico');
  });

  it('omite notificación si el equipo ya está en estado Disponible', async () => {
    const ingresoDisponible = {
      ...ingresoConEquipo,
      equipo: { ...ingresoConEquipo.equipo, estado: 'Disponible' },
    };
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoDisponible);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await notificarCambioEtapa(10, datosEtapa);

    expect(axios.post).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('omite notificación si el equipo está en "Disp. Pdte. MP."', async () => {
    const ingresoDispPdte = {
      ...ingresoConEquipo,
      equipo: { ...ingresoConEquipo.equipo, estado: 'Disp. Pdte. MP.' },
    };
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoDispPdte);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await notificarCambioEtapa(10, datosEtapa);

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('no lanza excepción si el ingreso no existe', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(null);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(notificarCambioEtapa(99, datosEtapa)).resolves.toBeUndefined();
  });

  it('no lanza excepción si Prisma falla', async () => {
    mockPrismaInstance.ingreso.findUnique.mockRejectedValue(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notificarCambioEtapa(10, datosEtapa)).resolves.toBeUndefined();
  });
});
