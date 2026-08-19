-- CreateTable
CREATE TABLE "ActoEstatutario" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "desde" TEXT NOT NULL,
    "hasta" TEXT NOT NULL,
    "motivo" TEXT,
    "registradoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActoEstatutario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActoEstatutario_socioId_creadoEn_idx" ON "ActoEstatutario"("socioId", "creadoEn");

-- AddForeignKey
ALTER TABLE "ActoEstatutario" ADD CONSTRAINT "ActoEstatutario_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
