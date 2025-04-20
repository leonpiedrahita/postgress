-- CreateTable
CREATE TABLE "reporte" (
    "id" TEXT NOT NULL,
    "numero" INTEGER,
    "tipodeasistencia" TEXT NOT NULL,
    "duracion" TEXT,
    "fechadeinicio" TEXT NOT NULL,
    "fechadefinalizacion" TEXT NOT NULL,
    "infoequipo" JSONB NOT NULL,
    "propietario" TEXT NOT NULL,
    "nombrecliente" TEXT NOT NULL,
    "nitcliente" TEXT NOT NULL,
    "sedecliente" TEXT NOT NULL,
    "direccioncliente" TEXT NOT NULL,
    "profesionalcliente" TEXT,
    "telefonocliente" TEXT,
    "hallazgos" TEXT,
    "actividades" TEXT,
    "pruebas" TEXT,
    "repuestos" TEXT,
    "observaciones" TEXT,
    "firmacliente" TEXT,
    "firmaingeniero" TEXT,
    "ingeniero" TEXT NOT NULL,
    "reporteexterno" INTEGER NOT NULL,
    "llavereporte" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reporte_numero_key" ON "reporte"("numero");
