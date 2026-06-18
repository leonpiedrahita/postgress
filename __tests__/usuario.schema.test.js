const { actualizarSchema } = require('../src/schemas/usuario.schema');

describe('usuario.schema — actualizarSchema', () => {
  // Regresión: Usuario.estado es Int en Prisma (@default(1)) y el FRONT envía 1/0
  // desde un v-select (estadoOpciones: [{ value: 1 }, { value: 0 }]). Si el esquema
  // lo valida como z.boolean(), CUALQUIER edición de usuario falla con 400, porque
  // estado siempre se incluye en el payload de actualización.
  it('acepta el payload real enviado por AdministracionUsuariosComponent (estado numérico)', () => {
    const r = actualizarSchema.safeParse({
      nombre: 'Leo',
      email: 'leo@test.com',
      rol: 'administrador',
      estado: 1,
      telefono: null,
    });
    expect(r.success).toBe(true);
  });

  it('acepta estado = 0 (usuario bloqueado)', () => {
    const r = actualizarSchema.safeParse({ estado: 0 });
    expect(r.success).toBe(true);
    expect(r.data.estado).toBe(0);
  });

  it('coacciona estado enviado como string numérico', () => {
    const r = actualizarSchema.safeParse({ estado: '1' });
    expect(r.success).toBe(true);
    expect(r.data.estado).toBe(1);
  });

  it('rechaza un rol fuera de la lista permitida', () => {
    const r = actualizarSchema.safeParse({ rol: 'rol-inexistente' });
    expect(r.success).toBe(false);
  });
});
