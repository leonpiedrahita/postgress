/*
  Warnings:

  - Changed the type of `etapaActual` on the `ingresos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ultimaEtapa` on the `ingresos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "etapas" ALTER COLUMN "fecha" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ingresos" DROP COLUMN "etapaActual",
ADD COLUMN     "etapaActual" INTEGER NOT NULL,
DROP COLUMN "ultimaEtapa",
ADD COLUMN     "ultimaEtapa" INTEGER NOT NULL;
