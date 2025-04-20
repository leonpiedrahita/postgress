/*
  Warnings:

  - A unique constraint covering the columns `[nombre]` on the table `ref_equipos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ref_equipos_nombre_key" ON "ref_equipos"("nombre");
