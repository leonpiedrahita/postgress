-- CreateTable
CREATE TABLE "ingresos" (
    "id" SERIAL NOT NULL,
    "equipoId" INTEGER NOT NULL,
    "etapaActual" TEXT NOT NULL,
    "ultimaEtapa" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingresos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" SERIAL NOT NULL,
    "ingresoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "comentario" TEXT,
    "responsable" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_ingresoId_fkey" FOREIGN KEY ("ingresoId") REFERENCES "ingresos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
