-- Columnas para la rama cartera
-- Ejecutar en producción si no se usa prisma migrate

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS atencion TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS asesor TEXT;
