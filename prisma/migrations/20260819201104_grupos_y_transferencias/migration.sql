-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "predioId" TEXT,
    "nombre" TEXT NOT NULL,
    "profesorId" TEXT,
    "cupo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "dia" INTEGER NOT NULL,
    "hora" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "HorarioGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscripcionGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InscripcionGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferenciaLote" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "vendedor" TEXT NOT NULL,
    "comprador" TEXT NOT NULL,
    "cuotasTransferencia" INTEGER NOT NULL DEFAULT 0,
    "cuotasAdjudicacion" INTEGER NOT NULL DEFAULT 0,
    "entreFamiliares" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3) NOT NULL,
    "aprobada" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferenciaLote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grupo_actividadId_idx" ON "Grupo"("actividadId");

-- CreateIndex
CREATE INDEX "Grupo_profesorId_idx" ON "Grupo"("profesorId");

-- CreateIndex
CREATE INDEX "HorarioGrupo_grupoId_idx" ON "HorarioGrupo"("grupoId");

-- CreateIndex
CREATE INDEX "InscripcionGrupo_socioId_idx" ON "InscripcionGrupo"("socioId");

-- CreateIndex
CREATE UNIQUE INDEX "InscripcionGrupo_grupoId_socioId_key" ON "InscripcionGrupo"("grupoId", "socioId");

-- CreateIndex
CREATE INDEX "Asistencia_grupoId_fecha_idx" ON "Asistencia"("grupoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Asistencia_grupoId_socioId_fecha_key" ON "Asistencia"("grupoId", "socioId", "fecha");

-- CreateIndex
CREATE INDEX "TransferenciaLote_loteId_idx" ON "TransferenciaLote"("loteId");

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioGrupo" ADD CONSTRAINT "HorarioGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionGrupo" ADD CONSTRAINT "InscripcionGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionGrupo" ADD CONSTRAINT "InscripcionGrupo_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaLote" ADD CONSTRAINT "TransferenciaLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
