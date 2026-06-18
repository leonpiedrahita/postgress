-- DropIndex
DROP INDEX "ref_equipos_nombre_key";

-- CreateIndex
CREATE UNIQUE INDEX "ref_equipos_nombre_marca_key" ON "ref_equipos"("nombre", "marca");
