/*
  Warnings:

  - You are about to drop the column `historialPropietarios` on the `equipos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "equipos" DROP COLUMN "historialPropietarios";

-- CreateTable
CREATE TABLE "historial_propietario" (
    "id" SERIAL NOT NULL,
    "propietarioId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "ubicacionNombre" TEXT NOT NULL,
    "ubicacionDireccion" TEXT NOT NULL,
    "responsableId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "equipoId" INTEGER NOT NULL,

    CONSTRAINT "historial_propietario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historial_propietario" ADD CONSTRAINT "historial_propietario_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietario" ADD CONSTRAINT "historial_propietario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietario" ADD CONSTRAINT "historial_propietario_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietario" ADD CONSTRAINT "historial_propietario_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietario" ADD CONSTRAINT "historial_propietario_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
