/*
  Warnings:

  - Added the required column `proveedorId` to the `equipos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proveedorId` to the `historial_propietarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "proveedorId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "historial_propietarios" ADD COLUMN     "proveedorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_propietarios" ADD CONSTRAINT "historial_propietarios_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
