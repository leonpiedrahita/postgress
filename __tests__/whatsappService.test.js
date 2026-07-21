jest.mock('axios');
jest.mock('../src/prisma-client', () => ({
  getPrismaWithUser: jest.fn(() => mockPrismaInstance),
}));

const axios = require('axios');

const mockCfgNotif = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
};

const mockPrismaInstance = {
  ingreso: { findUnique: jest.fn() },
  etapa: { findUnique: jest.fn() },
  usuario: { findMany: jest.fn() },
  configuracionNotificacion: mockCfgNotif,
};

const {
  enviarPlantilla,
  enviarMensajeTexto,
  notificarIngresoEquipo,
  notificarCambioEtapa,
  notificarConfirmacionMovimiento,
} = require('../services/whatsappService');

const NUMERO_VALIDO = '+573001234567';
const NUMERO_INVALIDO = '3001234567';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.WHATSAPP_TOKEN = 'fake-token';
  process.env.WHATSAPP_PHONE_ID = '1234567890';
  process.env.WHATSAPP_VERSION = 'v19.0';
  // Por defecto: global habilitado, roles soporte y lumira
  mockCfgNotif.findUnique.mockResolvedValue({ habilitado: true });
  mockCfgNotif.findMany.mockResolvedValue([
    { rol: 'soporte' }, { rol: 'lumira' }, { rol: 'aplicaciones' },
  ]);
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
    etapas: [{ comentario: 'Pantalla dañada', responsable: 'Leo Piedrahita' }],
  };

  const usuariosMock = [
    { nombre: 'Ana López', telefono: '+573001111111' },
    { nombre: 'Carlos Ruiz', telefono: '+573002222222' },
  ];

  it('envía plantilla gomaint_nuevo_ingreso_responsable a todos los usuarios con teléfono', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    expect(axios.post).toHaveBeenCalledTimes(2);
    const llamadas = axios.post.mock.calls;
    expect(llamadas[0][1].template.name).toBe('gomaint_nuevo_ingreso_responsable');
    expect(llamadas[0][1].to).toBe('+573001111111');
    expect(llamadas[1][1].to).toBe('+573002222222');
  });

  it('incluye el responsable de la etapa inicial como sexto parámetro', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    const parametros = axios.post.mock.calls[0][1].template.components[0].parameters;
    expect(parametros).toHaveLength(6);
    expect(parametros[5]).toEqual({ type: 'text', text: 'Leo Piedrahita' });
  });

  it('usa "Sin responsable" cuando la etapa inicial no tiene responsable', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue({
      ...ingresoMock,
      etapas: [{ comentario: 'Pantalla dañada', responsable: null }],
    });
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    const parametros = axios.post.mock.calls[0][1].template.components[0].parameters;
    expect(parametros[5]).toEqual({ type: 'text', text: 'Sin responsable' });
  });

  it('pasa los roles no-comerciales habilitados a la consulta de usuarios', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'soporte' }, { rol: 'comercial' }]);
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    // El equipo no tiene asesor asignado, así que no se consulta comercial.
    expect(mockPrismaInstance.usuario.findMany).toHaveBeenCalledTimes(1);
    const callArg = mockPrismaInstance.usuario.findMany.mock.calls[0][0];
    expect(callArg.where.rol.in).toContain('soporte');
    expect(callArg.where.rol.in).toContain('administrador');
    expect(callArg.where.rol.in).not.toContain('comercial');
  });

  // Regresión: los asesores comerciales reportaban recibir notificaciones de
  // equipos de clientes que no eran suyos. La causa: el rol comercial se
  // notificaba junto con los demás roles, sin filtrar por equipo.asesor.
  it('solo notifica al comercial asignado como asesor del equipo, no a otros comerciales', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'comercial' }]);
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue({
      ...ingresoMock,
      equipo: { ...ingresoMock.equipo, asesor: 'Ana López' },
    });
    mockPrismaInstance.usuario.findMany.mockResolvedValue([
      { nombre: 'Ana López', telefono: '+573001111111' },
    ]);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    const callArg = mockPrismaInstance.usuario.findMany.mock.calls.find(c => c[0].where.rol?.in?.includes('comercial'))[0];
    expect(callArg.where.nombre).toBe('Ana López');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][1].to).toBe('+573001111111');
  });

  // 'Dir. Comercial' comparte el filtrado por asesor de 'comercial': solo se le
  // notifica si está asignado como asesor del equipo.
  it('filtra Dir. Comercial por asesor igual que comercial', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'Dir. Comercial' }]);
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue({
      ...ingresoMock,
      equipo: { ...ingresoMock.equipo, asesor: 'Ana López' },
    });
    mockPrismaInstance.usuario.findMany.mockResolvedValue([
      { nombre: 'Ana López', telefono: '+573001111111' },
    ]);
    axios.post.mockResolvedValue({ data: {} });

    await notificarIngresoEquipo(1);

    const callArg = mockPrismaInstance.usuario.findMany.mock.calls.find(c => c[0].where.rol?.in?.includes('Dir. Comercial'))[0];
    expect(callArg.where.nombre).toBe('Ana López');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][1].to).toBe('+573001111111');
  });

  it('no consulta comercial si el equipo no tiene asesor asignado (solo administrador, auto-incluido)', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'comercial' }]);
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue({
      ...ingresoMock,
      equipo: { ...ingresoMock.equipo, asesor: null },
    });
    mockPrismaInstance.usuario.findMany.mockResolvedValue([]);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarIngresoEquipo(1);

    // Una sola consulta (administrador, auto-incluido); ninguna por rol comercial.
    expect(mockPrismaInstance.usuario.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaInstance.usuario.findMany.mock.calls[0][0].where.rol).toEqual({ in: ['administrador'] });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('no envía nada si el toggle global está desactivado', async () => {
    mockCfgNotif.findUnique.mockResolvedValue({ habilitado: false });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarIngresoEquipo(1);

    expect(axios.post).not.toHaveBeenCalled();
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
    etapaNueva: 'Soporte ingeniería',
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
    expect(params[0].text).toBe('Hospital Norte');
    expect(params[1].text).toBe('Desfibrilador - DF-007');
    expect(params[2].text).toBe('En soporte');
    expect(params[3].text).toBe('Recepción');
    expect(params[4].text).toBe('Soporte ingeniería');
    expect(params[5].text).toBe('Taller electrónica');
    expect(params[6].text).toBe('Revisión de PCB');
    expect(params[7].text).toBe('Pedro Técnico');
    expect(params[8].text).toBe('Medellín');
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

  it('omite notificación cuando etapaFinalizada=Desinfección', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await notificarCambioEtapa(10, { ...datosEtapa, etapaFinalizada: 'Desinfección' });

    expect(axios.post).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('pasa los roles habilitados de la BD a la consulta de usuarios', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'soporte' }, { rol: 'lumira' }]);
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(ingresoConEquipo);
    mockPrismaInstance.usuario.findMany.mockResolvedValue(usuariosMock);
    axios.post.mockResolvedValue({ data: {} });

    await notificarCambioEtapa(10, datosEtapa);

    const where = mockPrismaInstance.usuario.findMany.mock.calls[0][0].where;
    expect(where.rol.in).toContain('soporte');
    expect(where.rol.in).toContain('lumira');
  });

  it('no envía nada si el toggle global está desactivado', async () => {
    mockCfgNotif.findUnique.mockResolvedValue({ habilitado: false });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarCambioEtapa(10, datosEtapa);

    expect(axios.post).not.toHaveBeenCalled();
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

// ─── notificarCambioEtapa — lógica comercial ──────────────────────────────────

describe('notificarCambioEtapa — lógica comercial', () => {
  const datosEtapaBase = {
    etapaFinalizada: 'Cuarentena',
    etapaNueva: 'Soporte ingeniería',
    ubicacion: 'Taller',
    comentario: 'Revisión',
    responsable: 'Técnico',
  };

  const equipoConAsesor = (estado = 'En soporte') => ({
    id: 10,
    equipo: {
      nombre: 'Monitor',
      serie: 'MN-001',
      estado,
      asesor: 'María Gómez',
      cliente: { nombre: 'Hospital Sur', sedePrincipal: { ciudad: 'Bogotá' } },
    },
  });

  const equipoSinAsesor = {
    id: 10,
    equipo: {
      nombre: 'Monitor',
      serie: 'MN-001',
      estado: 'En soporte',
      asesor: null,
      cliente: { nombre: 'Hospital Sur', sedePrincipal: { ciudad: 'Bogotá' } },
    },
  };

  beforeEach(() => {
    // Roles habilitados: comercial + soporte
    mockCfgNotif.findUnique.mockResolvedValue({ habilitado: true });
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'comercial' }, { rol: 'soporte' }]);
    axios.post.mockResolvedValue({ data: {} });
  });

  it('envía a todos los comerciales cuando el estado es Disponible', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(
      equipoConAsesor('Disponible')
    );
    // Primera llamada: otros roles (soporte + administrador)
    // Segunda llamada: todos los comerciales (broadcast)
    mockPrismaInstance.usuario.findMany
      .mockResolvedValueOnce([])                             // otros roles sin teléfono
      .mockResolvedValueOnce([{ telefono: '+573001111111' }, { telefono: '+573002222222' }]); // todos comerciales

    await notificarCambioEtapa(10, { ...datosEtapaBase, estadoEquipo: 'Disponible' });

    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('envía a todos los comerciales cuando el estado es Disponible Pdte. MP.', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(
      equipoConAsesor('Disponible Pdte. MP.')
    );
    mockPrismaInstance.usuario.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ telefono: '+573001111111' }, { telefono: '+573003333333' }]);

    await notificarCambioEtapa(10, { ...datosEtapaBase, estadoEquipo: 'Disponible Pdte. MP.' });

    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('envía solo al asesor asignado en estado normal', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(equipoConAsesor());
    mockPrismaInstance.usuario.findMany
      .mockResolvedValueOnce([{ telefono: '+573009999999' }]) // soporte/admin
      .mockResolvedValueOnce([{ telefono: '+573005555555' }]); // asesor específico

    await notificarCambioEtapa(10, datosEtapaBase);

    expect(axios.post).toHaveBeenCalledTimes(2);
    const telefonos = axios.post.mock.calls.map(c => c[1].to);
    expect(telefonos).toContain('+573009999999');
    expect(telefonos).toContain('+573005555555');
  });

  it('la consulta del asesor filtra por nombre del asesor del equipo', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(equipoConAsesor());
    mockPrismaInstance.usuario.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ telefono: '+573005555555' }]);

    await notificarCambioEtapa(10, datosEtapaBase);

    const llamadasFindMany = mockPrismaInstance.usuario.findMany.mock.calls;
    const llamadaAsesor = llamadasFindMany[1][0];
    expect(llamadaAsesor.where.nombre).toBe('María Gómez');
    expect(llamadaAsesor.where.rol).toEqual({ in: ['comercial'] });
  });

  it('no envía a ningún comercial si el equipo no tiene asesor asignado', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(equipoSinAsesor);
    // Solo una llamada: otros roles (sin asesor → Promise.resolve([]))
    mockPrismaInstance.usuario.findMany.mockResolvedValueOnce([{ telefono: '+573009999999' }]);

    await notificarCambioEtapa(10, datosEtapaBase);

    const telefonos = axios.post.mock.calls.map(c => c[1].to);
    expect(telefonos).not.toContain(undefined);
    // Solo el usuario de soporte/admin, ningún comercial
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('deduplica teléfonos si un usuario aparece en varios grupos', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(equipoConAsesor('Disponible'));
    const telefonoCompartido = '+573001111111';
    mockPrismaInstance.usuario.findMany
      .mockResolvedValueOnce([{ telefono: telefonoCompartido }]) // otros roles
      .mockResolvedValueOnce([{ telefono: telefonoCompartido }, { telefono: '+573002222222' }]); // comerciales

    await notificarCambioEtapa(10, { ...datosEtapaBase, estadoEquipo: 'Disponible' });

    const telefonos = axios.post.mock.calls.map(c => c[1].to);
    const unicos = new Set(telefonos);
    expect(unicos.size).toBe(telefonos.length); // sin duplicados
    expect(telefonos).toContain(telefonoCompartido);
    expect(telefonos).toContain('+573002222222');
  });

  it('no envía nada si no hay usuarios en ningún grupo', async () => {
    mockPrismaInstance.ingreso.findUnique.mockResolvedValue(equipoConAsesor());
    mockPrismaInstance.usuario.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await notificarCambioEtapa(10, datosEtapaBase);

    expect(axios.post).not.toHaveBeenCalled();
  });
});

// ─── notificarConfirmacionMovimiento ──────────────────────────────────────────
// Regresión: misma causa que notificarIngresoEquipo -- el rol comercial se
// notificaba sin filtrar por equipo.asesor.

describe('notificarConfirmacionMovimiento', () => {
  const etapaMock = {
    id: 7,
    ubicacion: 'Bodega Central',
    ingreso: {
      equipo: {
        nombre: 'Monitor Multiparámetros',
        serie: 'SN-001',
        cliente: { nombre: 'Clínica Central' },
      },
    },
  };

  it('notifica a los roles no-comerciales habilitados', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'bodega' }]);
    mockPrismaInstance.etapa.findUnique.mockResolvedValue(etapaMock);
    mockPrismaInstance.usuario.findMany.mockResolvedValue([{ telefono: '+573001111111' }]);
    axios.post.mockResolvedValue({ data: {} });

    await notificarConfirmacionMovimiento(1, 7, { confirmadoPor: 'Ana López' });

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][1].to).toBe('+573001111111');
  });

  it('solo notifica al comercial asignado como asesor del equipo', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'comercial' }]);
    mockPrismaInstance.etapa.findUnique.mockResolvedValue({
      ...etapaMock,
      ingreso: { equipo: { ...etapaMock.ingreso.equipo, asesor: 'Ana López' } },
    });
    mockPrismaInstance.usuario.findMany.mockResolvedValue([
      { telefono: '+573001111111' },
    ]);
    axios.post.mockResolvedValue({ data: {} });

    await notificarConfirmacionMovimiento(1, 7, { confirmadoPor: 'Ana López' });

    const callArg = mockPrismaInstance.usuario.findMany.mock.calls.find(c => c[0].where.rol?.in?.includes('comercial'))[0];
    expect(callArg.where.nombre).toBe('Ana López');
  });

  it('no consulta comercial si el equipo no tiene asesor asignado', async () => {
    mockCfgNotif.findMany.mockResolvedValue([{ rol: 'comercial' }]);
    mockPrismaInstance.etapa.findUnique.mockResolvedValue({
      ...etapaMock,
      ingreso: { equipo: { ...etapaMock.ingreso.equipo, asesor: null } },
    });
    mockPrismaInstance.usuario.findMany.mockResolvedValue([]);

    await notificarConfirmacionMovimiento(1, 7, { confirmadoPor: 'Ana López' });

    expect(mockPrismaInstance.usuario.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaInstance.usuario.findMany.mock.calls[0][0].where.rol).toEqual({ in: ['administrador'] });
  });

  it('no hace nada si la etapa no existe', async () => {
    mockPrismaInstance.etapa.findUnique.mockResolvedValue(null);

    await notificarConfirmacionMovimiento(1, 999, { confirmadoPor: 'Ana López' });

    expect(axios.post).not.toHaveBeenCalled();
  });
});
