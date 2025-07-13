-- CreateTable
CREATE TABLE "documentos_soporte" (
    "id" SERIAL NOT NULL,
    "nombreDocumento" TEXT NOT NULL,
    "llaveDocumento" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "historialServicioId" INTEGER,

    CONSTRAINT "documentos_soporte_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documentos_soporte" ADD CONSTRAINT "documentos_soporte_historialServicioId_fkey" FOREIGN KEY ("historialServicioId") REFERENCES "historial_servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
