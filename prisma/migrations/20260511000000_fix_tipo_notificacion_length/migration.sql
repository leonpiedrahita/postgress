-- Renombra la columna local (tipo_notificacion) al nombre que usa Prisma ("tipoNotificacion")
-- Solo aplica si la columna existe como tipo_notificacion (entornos locales creados manualmente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_notificaciones' AND column_name = 'tipo_notificacion'
  ) THEN
    ALTER TABLE configuracion_notificaciones RENAME COLUMN tipo_notificacion TO "tipoNotificacion";
  END IF;
END $$;

-- Ampliar longitud de columnas para soportar valores como 'etapa_cotizacion_solicitada'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'configuracion_notificaciones'
  ) THEN
    ALTER TABLE configuracion_notificaciones ALTER COLUMN "tipoNotificacion" TYPE VARCHAR(50);
    ALTER TABLE configuracion_notificaciones ALTER COLUMN rol TYPE VARCHAR(100);
  END IF;
END $$;
