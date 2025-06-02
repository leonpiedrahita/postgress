/*
  Warnings:

  - Made the column `proveedorId` on table `equipos` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "equipos" DROP CONSTRAINT "equipos_proveedorId_fkey";

-- AlterTable
ALTER TABLE "equipos" ALTER COLUMN "proveedorId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
