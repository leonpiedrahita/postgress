/*
  Warnings:

  - A unique constraint covering the columns `[serie]` on the table `equipos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "equipos_serie_key" ON "equipos"("serie");
