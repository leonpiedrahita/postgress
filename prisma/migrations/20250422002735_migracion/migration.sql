-- AlterTable
ALTER TABLE "documentos_legales" ADD COLUMN     "refEquipoId" INTEGER;

-- AddForeignKey
ALTER TABLE "documentos_legales" ADD CONSTRAINT "documentos_legales_refEquipoId_fkey" FOREIGN KEY ("refEquipoId") REFERENCES "ref_equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
