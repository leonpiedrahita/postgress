-- Script de datos: marcar última etapa de ingresos abiertos como pendiente de confirmación.
-- Ejecutar UNA SOLA VEZ después de aplicar la migración 20260601000000_add_etapa_confirmacion.
--
-- Excepciones (no requieren confirmación física):
--   - Etapa "Despachado"
--   - Ubicación que contenga "cliente" (equipo ya en sitio del cliente)
--   - Ubicación que contenga "dado de baja"
--
-- Uso:
--   psql $DATABASE_URL -f prisma/seed-confirmacion-abiertos.sql

UPDATE etapas
SET confirmado = FALSE
WHERE id IN (
  SELECT DISTINCT ON (e."ingresoId") e.id
  FROM etapas e
  JOIN ingresos i ON i.id = e."ingresoId"
  WHERE i.estado = 'Abierto'
    AND LOWER(e.nombre)    != 'despachado'
    AND LOWER(e.ubicacion) NOT LIKE '%cliente%'
    AND LOWER(e.ubicacion) NOT LIKE '%dado de baja%'
  ORDER BY e."ingresoId", e.id DESC
);
