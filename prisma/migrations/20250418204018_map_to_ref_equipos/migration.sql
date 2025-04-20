-- CreateTable
CREATE TABLE "ref_equipos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "servicio" TEXT NOT NULL,
    "clasificacionriesgo" TEXT NOT NULL,
    "periodicidadmantenimiento" TEXT NOT NULL,
    "alto" TEXT NOT NULL,
    "ancho" TEXT NOT NULL,
    "profundo" TEXT NOT NULL,
    "peso" TEXT NOT NULL,
    "voltaje" TEXT NOT NULL,
    "corriente" TEXT NOT NULL,
    "potencia" TEXT NOT NULL,
    "principiodemedicion" TEXT NOT NULL,
    "pruebasporhora" TEXT NOT NULL,
    "temperatura" TEXT NOT NULL,
    "humedad" TEXT NOT NULL,
    "agua" TEXT NOT NULL,
    "desague" TEXT NOT NULL,
    "recomendaciones" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_equipos_pkey" PRIMARY KEY ("id")
);
