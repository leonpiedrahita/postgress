const { registrarIngresoSchema, agregarEtapaSchema } = require('../src/schemas/ingreso.schema');

describe('ingreso.schema — agregarEtapaSchema', () => {
  const payloadValido = {
    nombre: 'Soporte',
    comentario: 'Observación inicial',
    responsable: 'Leo',
    fecha: '(17-06-2026)',
    ubicacion: 'Taller',
    etapaActual: 3,
    ultimaEtapa: 3,
    estado: 'Abierto',
    nuevoestadoequipo: null,
  };

  // Regresión: etapaActual y ultimaEtapa son Int en el modelo Prisma (Ingreso) y el
  // FRONT los envía como número (this.ingreso.etapaActual++). Si el esquema los
  // valida como string sin coacción, cualquier cambio de etapa falla con 400.
  it('acepta el payload real enviado por SeguimientoIngresosComponent (etapaActual/ultimaEtapa numéricos)', () => {
    const r = agregarEtapaSchema.safeParse(payloadValido);
    expect(r.success).toBe(true);
  });

  it('coacciona etapaActual/ultimaEtapa enviados como string numérico', () => {
    const r = agregarEtapaSchema.safeParse({ ...payloadValido, etapaActual: '3', ultimaEtapa: '3' });
    expect(r.success).toBe(true);
    expect(r.data.etapaActual).toBe(3);
    expect(r.data.ultimaEtapa).toBe(3);
  });

  it('rechaza cuando falta etapaActual', () => {
    const { etapaActual, ...sinEtapaActual } = payloadValido;
    const r = agregarEtapaSchema.safeParse(sinEtapaActual);
    expect(r.success).toBe(false);
  });

  it('rechaza cuando falta estado', () => {
    const { estado, ...sinEstado } = payloadValido;
    const r = agregarEtapaSchema.safeParse(sinEstado);
    expect(r.success).toBe(false);
  });

  it('acepta nuevoestadoequipo null cuando no hay cambio de estado', () => {
    const r = agregarEtapaSchema.safeParse({ ...payloadValido, nuevoestadoequipo: null });
    expect(r.success).toBe(true);
  });
});

describe('ingreso.schema — registrarIngresoSchema', () => {
  it('acepta un payload válido de registro de ingreso', () => {
    const r = registrarIngresoSchema.safeParse({
      equipo: { id: 10 },
      etapa: {
        etapaSeleccionada: 'Soporte',
        ubicacionEtapaSeleccionada: 'Taller',
        nombre: 'Soporte',
        fecha: '(17-06-2026)',
        ubicacion: 'Taller',
      },
    });
    expect(r.success).toBe(true);
  });

  it('coacciona equipo.id enviado como string numérico', () => {
    const r = registrarIngresoSchema.safeParse({
      equipo: { id: '10' },
      etapa: {
        etapaSeleccionada: 'Soporte',
        ubicacionEtapaSeleccionada: 'Taller',
        nombre: 'Soporte',
        fecha: '(17-06-2026)',
        ubicacion: 'Taller',
      },
    });
    expect(r.success).toBe(true);
    expect(r.data.equipo.id).toBe(10);
  });
});
