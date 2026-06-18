const { registrarSchema } = require('../src/schemas/reporte.schema');

describe('reporte.schema — registrarSchema', () => {
  const payloadValido = {
    reporte: {
      tipodeasistencia: 'Preventivo',
      duracion: '2',
      fechadeinicio: '2026-06-18',
      fechadefinalizacion: '2026-06-18',
      infoequipo: { nombre: 'Ventilador X', serie: 'SN123', marca: 'GE' },
      propietario: 'Hospital X',
      nombrecliente: 'Hospital X',
      nitcliente: '900123456',
      sedecliente: 'Principal',
      direccioncliente: 'Cra 1 # 2-3',
      profesionalcliente: 'Dr. García',
      telefonocliente: '3001234567',
      hallazgos: 'Ninguno',
      actividades: 'Limpieza general',
      pruebas: 'Prueba eléctrica',
      repuestos: 'Sin repuestos',
      observaciones: 'N/A',
      firmacliente: '',
      firmaingeniero: '',
      ingeniero: 'Leo',
    },
    id_equipo: 42,
  };

  // Regresión: el FRONT envía { reporte, id_equipo } a api/reporte/registrar, pero
  // el esquema solo declaraba `reporte`. validate() hace req.body = result.data,
  // así que Zod descartaba silenciosamente id_equipo. equipoController.registrarreporte
  // (siguiente middleware) necesita req.body.id_equipo para vincular el HistorialServicio
  // al equipo — sin él, parseInt(undefined) = NaN y la petición fallaba con 500,
  // dejando un Reporte huérfano sin vincular (el reporte "no se guardaba" para el usuario).
  it('conserva id_equipo tras la validación (no debe ser descartado)', () => {
    const r = registrarSchema.safeParse(payloadValido);
    expect(r.success).toBe(true);
    expect(r.data.id_equipo).toBe(42);
  });

  it('coacciona id_equipo enviado como string numérico', () => {
    const r = registrarSchema.safeParse({ ...payloadValido, id_equipo: '42' });
    expect(r.success).toBe(true);
    expect(r.data.id_equipo).toBe(42);
  });

  it('rechaza cuando falta id_equipo', () => {
    const { id_equipo, ...sinIdEquipo } = payloadValido;
    const r = registrarSchema.safeParse(sinIdEquipo);
    expect(r.success).toBe(false);
  });

  it('rechaza cuando falta tipodeasistencia', () => {
    const { tipodeasistencia, ...sinTipo } = payloadValido.reporte;
    const r = registrarSchema.safeParse({ ...payloadValido, reporte: sinTipo });
    expect(r.success).toBe(false);
  });

  // Regresión: el FRONT siempre envía infoequipo como objeto { nombre, serie, marca }
  // (ver FormularioGenerarOrdenComponent.vue e ImprimirReporteComponent.vue), nunca
  // como string/number. El esquema lo validaba con z.union([z.string(), z.number()]),
  // que rechaza objetos — esto rompía CUALQUIER guardado de reporte interno con 400.
  it('acepta infoequipo como objeto {nombre, serie, marca}', () => {
    const r = registrarSchema.safeParse(payloadValido);
    expect(r.success).toBe(true);
    expect(r.data.reporte.infoequipo).toEqual({ nombre: 'Ventilador X', serie: 'SN123', marca: 'GE' });
  });

  // Regresión: changeDuration() en FormularioGenerarOrdenComponent asigna duracion
  // como número (0.5, 20, o resultado de +step) cuando se usan los botones +/-, y
  // como string cuando se escribe directamente. El esquema solo aceptaba string.
  it('acepta duracion como número (ajustada con los botones +/-)', () => {
    const r = registrarSchema.safeParse({ ...payloadValido, reporte: { ...payloadValido.reporte, duracion: 2.5 } });
    expect(r.success).toBe(true);
    expect(r.data.reporte.duracion).toBe(2.5);
  });

  it('acepta duracion como string (escrita directamente)', () => {
    const r = registrarSchema.safeParse({ ...payloadValido, reporte: { ...payloadValido.reporte, duracion: '2.5' } });
    expect(r.success).toBe(true);
  });
});
