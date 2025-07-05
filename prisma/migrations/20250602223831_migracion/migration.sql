/*
  Warnings:

  - You are about to drop the column `proveedorId` on the `equipos` table. All the data in the column will be lost.
  - You are about to drop the column `proveedorId` on the `historial_propietarios` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "equipos" DROP CONSTRAINT "equipos_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "historial_propietarios" DROP CONSTRAINT "historial_propietarios_proveedorId_fkey";

-- AlterTable
ALTER TABLE "equipos" DROP COLUMN "proveedorId";

-- AlterTable
ALTER TABLE "historial_propietarios" DROP COLUMN "proveedorId";
