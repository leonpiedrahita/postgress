-- Agrega campos de confirmación de movimiento físico a la tabla etapas
ALTER TABLE etapas
  ADD COLUMN IF NOT EXISTS confirmado        BOOLEAN   NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "confirmadoPor"   TEXT,
  ADD COLUMN IF NOT EXISTS "fechaConfirmacion" TIMESTAMP;
