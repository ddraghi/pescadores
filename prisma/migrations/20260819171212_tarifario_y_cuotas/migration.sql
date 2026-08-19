-- AlterTable
ALTER TABLE "Cuota" ADD COLUMN     "cobroId" TEXT,
ADD COLUMN     "concepto" TEXT NOT NULL DEFAULT 'Cuota social',
ADD COLUMN     "pagadaEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ItemTarifario" ADD COLUMN     "categoriaSocio" "CategoriaSocio",
ADD COLUMN     "porGrupoFamiliar" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Cuota_periodo_idx" ON "Cuota"("periodo");

-- CreateIndex
CREATE INDEX "ItemTarifario_categoriaSocio_porGrupoFamiliar_idx" ON "ItemTarifario"("categoriaSocio", "porGrupoFamiliar");

-- AddForeignKey
ALTER TABLE "Cuota" ADD CONSTRAINT "Cuota_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "Cobro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
