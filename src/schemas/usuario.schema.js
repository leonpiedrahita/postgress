const { z } = require('zod');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/;
const PASSWORD_MSG = 'Mínimo 6 caracteres con mayúscula, minúscula, número y carácter especial';
const TELEFONO_REGEX = /^\+\d{7,15}$/;
const ROLES = ['administrador', 'soporte', 'aplicaciones', 'comercial', 'cotizaciones', 'calidad', 'bodega', 'lumira', 'ventas', 'ingresos'];

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

const registrarSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_MSG),
  rol: z.enum(ROLES, { errorMap: () => ({ message: `Rol inválido. Opciones: ${ROLES.join(', ')}` }) }),
  telefono: z.string().regex(TELEFONO_REGEX, 'Teléfono debe estar en formato E.164 (ej: +573001234567)').optional(),
});

const actualizarContrasenaSchema = z.object({
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_MSG),
});

const cambiarContrasenaSchema = z.object({
  oldPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_MSG),
});

const actualizarSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  rol: z.enum(ROLES, { errorMap: () => ({ message: `Rol inválido. Opciones: ${ROLES.join(', ')}` }) }).optional(),
  estado: z.boolean({ invalid_type_error: 'estado debe ser un booleano' }).optional(),
  telefono: z.string().regex(TELEFONO_REGEX, 'Teléfono debe estar en formato E.164 (ej: +573001234567)').optional().nullable(),
});

module.exports = { loginSchema, registrarSchema, actualizarContrasenaSchema, cambiarContrasenaSchema, actualizarSchema };
