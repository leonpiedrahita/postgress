/*
  Warnings:

  - You are about to drop the `historial_propietario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "historial_propietario" DROP CONSTRAINT "historial_propietario_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "historial_propietario" DROP CONSTRAINT "historial_propietario_equipoId_fkey";

-- DropForeignKey
ALTER TABLE "historial_propietario" DROP CONSTRAINT "historial_propietario_propietarioId_fkey";

-- DropForeignKey
ALTER TABLE "historial_propietario" DROP CONSTRAINT "historial_propietario_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "historial_propietario" DROP CONSTRAINT "historial_propietario_responsableId_fkey";

-- DropTable
DROP TABLE "historial_propietario";

-- CreateTable
CREATE TABLE "historial_propietarios" (
    "id" SERIAL NOT NULL,
    "propietarioId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "ubicacionNombre" TEXT NOT NULL,
    "ubicacionDireccion" TEXT NOT NULL,
    "responsableId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "equipoId" INTEGER NOT NULL,

    CONSTRAINT "historial_propietarios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historial_propietarios" ADD CONSTRAINT "historial_propietarios_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietarios" ADD CONSTRAINT "historial_propietarios_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietarios" ADD CONSTRAINT "historial_propietarios_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietarios" ADD CONSTRAINT "historial_propietarios_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietarios" ADD CONSTRAINT "historial_propietarios_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
