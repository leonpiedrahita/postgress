-- DropForeignKey
ALTER TABLE "documentos_legales" DROP CONSTRAINT "documentos_legales_equipoId_fkey";

-- AlterTable
ALTER TABLE "documentos_legales" ALTER COLUMN "equipoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "documentos_legales" ADD CONSTRAINT "documentos_legales_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
