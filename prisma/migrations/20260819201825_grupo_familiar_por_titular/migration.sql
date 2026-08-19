-- El grupo familiar deja de ser una tabla.
--
-- Era una entidad con nombre propio, y en la práctica el nombre siempre terminaba
-- siendo el del socio titular. Ahora el grupo *es* el titular: los familiares cuelgan
-- de él con `titularId`, y el nombre del grupo se lee de su ficha.
--
-- El orden importa: primero se agregan las columnas nuevas y se mueven los datos, y
-- recién después se borra lo viejo. Al revés se pierde el padrón.

-- 1. Columnas nuevas.
ALTER TABLE "Socio" ADD COLUMN "titularId" TEXT;
ALTER TABLE "Socio" ADD COLUMN "parentesco" TEXT;

-- 2. Cada integrante que no era titular pasa a colgar del titular de su grupo.
--    Si un grupo quedó sin titular marcado —dato mal cargado—, sus integrantes quedan
--    sueltos, que es preferible a colgarlos de cualquiera.
UPDATE "Socio" AS s
SET "titularId" = t."id"
FROM "Socio" AS t
WHERE s."grupoFamiliarId" IS NOT NULL
  AND s."esTitular" = false
  AND t."grupoFamiliarId" = s."grupoFamiliarId"
  AND t."esTitular" = true;

-- 3. Recién ahora se va lo viejo.
ALTER TABLE "Socio" DROP CONSTRAINT "Socio_grupoFamiliarId_fkey";
ALTER TABLE "Socio" DROP COLUMN "esTitular";
ALTER TABLE "Socio" DROP COLUMN "grupoFamiliarId";
DROP TABLE "GrupoFamiliar";

-- 4. Índice y clave foránea de la relación nueva.
CREATE INDEX "Socio_titularId_idx" ON "Socio"("titularId");
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_titularId_fkey"
  FOREIGN KEY ("titularId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
