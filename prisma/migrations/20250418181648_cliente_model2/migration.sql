/*
  Warnings:

  - A unique constraint covering the columns `[nit]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "clientes_nit_key" ON "clientes"("nit");
