-- AlterTable
ALTER TABLE "Acceso" ADD COLUMN     "exigeAptoMedico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exigeDerecho" "TipoHabilitacion";
