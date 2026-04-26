-- Migration: create historial_estados_equipo table
-- Run this manually in production if prisma migrate is not available

CREATE TABLE IF NOT EXISTS historial_estados_equipo (
  id               SERIAL PRIMARY KEY,
  "equipoId"       INTEGER NOT NULL REFERENCES equipos(id),
  "estadoAnterior" TEXT,
  "estadoNuevo"    TEXT NOT NULL,
  "usuarioNombre"  TEXT NOT NULL,
  fecha            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_estados_equipo_equipoid
  ON historial_estados_equipo ("equipoId");
