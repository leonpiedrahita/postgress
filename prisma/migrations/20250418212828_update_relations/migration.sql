/*
  Warnings:

  - You are about to drop the `Usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Usuario";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" TEXT,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "idReferencia" INTEGER NOT NULL,
    "propietarioId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "ubicacionNombre" TEXT NOT NULL,
    "ubicacionDireccion" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "historialPropietarios" JSONB,
    "fechaDeInstalacion" TEXT,
    "placaDeInventario" TEXT NOT NULL,
    "tipoDeContrato" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_servicios" (
    "id" SERIAL NOT NULL,
    "identificacionDeReporte" INTEGER NOT NULL,
    "fechaDeFinalizacion" TEXT NOT NULL,
    "tipoDeAsistencia" TEXT NOT NULL,
    "responsableId" INTEGER NOT NULL,
    "reporteExterno" INTEGER NOT NULL,
    "llaveReporte" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "equipoId" INTEGER NOT NULL,

    CONSTRAINT "historial_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_legales" (
    "id" SERIAL NOT NULL,
    "nombreDocumento" TEXT NOT NULL,
    "llaveDocumento" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "equipoId" INTEGER NOT NULL,

    CONSTRAINT "documentos_legales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_idReferencia_fkey" FOREIGN KEY ("idReferencia") REFERENCES "ref_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_servicios" ADD CONSTRAINT "historial_servicios_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_servicios" ADD CONSTRAINT "historial_servicios_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_legales" ADD CONSTRAINT "documentos_legales_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
