-- AddForeignKey
ALTER TABLE "historial_servicios" ADD CONSTRAINT "historial_servicios_identificacionDeReporte_fkey" FOREIGN KEY ("identificacionDeReporte") REFERENCES "reporte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
