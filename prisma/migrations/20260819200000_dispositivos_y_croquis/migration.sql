-- Registro único de dispositivos, croquis, horarios y auditoría.
--
-- Hasta acá cada acceso guardaba su interruptor en dos campos sueltos. Esta migración
-- los pasa a una tabla propia para que no haya dos lugares donde configurar lo mismo.
--
-- El orden importa: primero se agrega la columna nueva y se crean las tablas, después
-- se trasladan los datos, y RECIÉN AHÍ se borran las columnas viejas. Al revés se
-- perdería la configuración de los interruptores ya cargados.

-- CreateEnum
CREATE TYPE "PropositoDispositivo" AS ENUM ('ACCESO', 'ILUMINACION', 'BOMBA', 'RIEGO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoDispositivo" AS ENUM ('ENCENDIDO', 'APAGADO', 'SIN_DATO');

-- AlterTable: por ahora sólo agregar.
ALTER TABLE "Acceso" ADD COLUMN     "dispositivoId" TEXT;

-- CreateTable
CREATE TABLE "Dispositivo" (
    "id" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "proposito" "PropositoDispositivo" NOT NULL DEFAULT 'OTRO',
    "via" TEXT NOT NULL DEFAULT 'sonoff_lan',
    "direccion" TEXT,
    "ubicacion" TEXT,
    "requiereConfirmacion" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoDispositivo" NOT NULL DEFAULT 'SIN_DATO',
    "estadoEn" TIMESTAMP(3),
    "croquisId" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Croquis" (
    "id" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Croquis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioDispositivo" (
    "id" TEXT NOT NULL,
    "dispositivoId" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "encender" BOOLEAN NOT NULL,
    "dias" INTEGER[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioDispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccionDispositivo" (
    "id" TEXT NOT NULL,
    "dispositivoId" TEXT NOT NULL,
    "personaId" TEXT,
    "accion" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    "aplicadaEn" TIMESTAMP(3),
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccionDispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dispositivo_deviceId_key" ON "Dispositivo"("deviceId");

-- CreateIndex
CREATE INDEX "Dispositivo_predioId_proposito_idx" ON "Dispositivo"("predioId", "proposito");

-- CreateIndex
CREATE INDEX "Croquis_predioId_orden_idx" ON "Croquis"("predioId", "orden");

-- CreateIndex
CREATE INDEX "HorarioDispositivo_dispositivoId_idx" ON "HorarioDispositivo"("dispositivoId");

-- CreateIndex
CREATE INDEX "AccionDispositivo_dispositivoId_creadoEn_idx" ON "AccionDispositivo"("dispositivoId", "creadoEn");

-- CreateIndex
CREATE INDEX "AccionDispositivo_aplicadaEn_idx" ON "AccionDispositivo"("aplicadaEn");

-- AddForeignKey
ALTER TABLE "Acceso" ADD CONSTRAINT "Acceso_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispositivo" ADD CONSTRAINT "Dispositivo_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispositivo" ADD CONSTRAINT "Dispositivo_croquisId_fkey" FOREIGN KEY ("croquisId") REFERENCES "Croquis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Croquis" ADD CONSTRAINT "Croquis_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioDispositivo" ADD CONSTRAINT "HorarioDispositivo_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccionDispositivo" ADD CONSTRAINT "AccionDispositivo_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccionDispositivo" ADD CONSTRAINT "AccionDispositivo_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Traslado de datos
--
-- Cada acceso que tenía un interruptor configurado pasa a tener su dispositivo en el
-- registro, y queda apuntando a él. El identificador de eWeLink todavía no se conoce
-- —hay que vincularlo desde la aplicación— así que se deja uno provisorio y visible.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "Dispositivo" (
    "id", "predioId", "nombre", "deviceId", "proposito", "via", "direccion", "ubicacion", "actualizadoEn"
)
SELECT
    gen_random_uuid()::text,
    a."predioId",
    a."nombre",
    'por-vincular-' || a."id",
    'ACCESO'::"PropositoDispositivo",
    COALESCE(a."dispositivoTipo", 'sonoff_lan'),
    a."dispositivoRef",
    a."nombre",
    CURRENT_TIMESTAMP
FROM "Acceso" a
WHERE a."dispositivoTipo" IS NOT NULL;

UPDATE "Acceso" a
SET "dispositivoId" = d."id"
FROM "Dispositivo" d
WHERE d."deviceId" = 'por-vincular-' || a."id";

-- Ahora sí: las columnas viejas ya no hacen falta.
ALTER TABLE "Acceso" DROP COLUMN "dispositivoRef", DROP COLUMN "dispositivoTipo";
