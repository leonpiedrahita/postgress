const { registrarSchema, actualizarSchema } = require('../src/schemas/refequipo.schema');

describe('refequipo.schema — registrarSchema', () => {
  const payloadValido = {
    nombre: 'Architect i1000',
    marca: 'Abbott',
    fabricante: 'Abbott Diagnostics',
    servicio: 'Inmunoensayo',
    clasificacionriesgo: 'IIb',
    periodicidadmantenimiento: 'Trimestral',
    alto: '120',
    ancho: '80',
    profundo: '60',
    peso: '250',
    voltaje: '110V',
    corriente: '10A',
    potencia: '1500W',
    principiodemedicion: 'Quimioluminiscencia',
    pruebasporhora: '100',
    temperatura: '18-25C',
    humedad: '30-70%',
    agua: 'Si',
    desague: 'Si',
    recomendaciones: 'Ninguna',
  };

  // Regresión: estos campos son String en el modelo Prisma (RefEquipo) y en el
  // formulario del FRONT; si el esquema los coacciona a número, la validación
  // falla con cualquier valor real ("Trimestral", "120", etc.) y el registro
  // de una nueva referencia se rompe por completo.
  it('acepta el payload real enviado por el formulario (todos los campos como string)', () => {
    const r = registrarSchema.safeParse(payloadValido);
    expect(r.success).toBe(true);
  });

  it('rechaza cuando falta el nombre', () => {
    const { nombre, ...sinNombre } = payloadValido;
    const r = registrarSchema.safeParse(sinNombre);
    expect(r.success).toBe(false);
  });

  it('acepta campos opcionales nulos o ausentes', () => {
    const r = registrarSchema.safeParse({ nombre: 'Equipo X' });
    expect(r.success).toBe(true);
  });

  it('acepta periodicidadmantenimiento como texto categórico', () => {
    const r = registrarSchema.safeParse({ ...payloadValido, periodicidadmantenimiento: 'Libre de mantenimiento' });
    expect(r.success).toBe(true);
  });
});

describe('refequipo.schema — actualizarSchema', () => {
  it('rechaza un objeto vacío', () => {
    const r = actualizarSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('acepta actualizar un único campo de texto numérico', () => {
    const r = actualizarSchema.safeParse({ alto: '130' });
    expect(r.success).toBe(true);
  });
});
