/*
  Warnings:

  - Added the required column `tipoDeContrato` to the `historial_propietarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "historial_propietarios" ADD COLUMN     "tipoDeContrato" TEXT NOT NULL;
