-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "proveedorId" INTEGER;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
