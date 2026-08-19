import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { gruposDelProfesor } from "@/lib/datos/grupos";
import { AsistenciaCliente } from "./cliente";

export default async function Pagina() {
  const sesion = await exigirCapacidad("administrar_grupos");
  const grupos = (await gruposDelProfesor(sesion.personaId)).filter((g) => g.activo);

  // Las asistencias del último mes, para poder corregir una lista ya cargada.
  const desde = new Date();
  desde.setDate(desde.getDate() - 30);
  const cargadas = await prisma.asistencia.findMany({
    where: { grupoId: { in: grupos.map((g) => g.id) }, fecha: { gte: desde }, presente: true },
    select: { grupoId: true, socioId: true, fecha: true },
  });

  const yaTomadas: Record<string, string[]> = {};
  for (const a of cargadas) {
    const clave = `${a.grupoId}|${a.fecha.toISOString().slice(0, 10)}`;
    (yaTomadas[clave] ??= []).push(a.socioId);
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Asistencia"
        descripcion="Todos arrancan presentes: destildá a los que faltaron."
      />
      <AsistenciaCliente grupos={grupos} yaTomadas={yaTomadas} />
    </>
  );
}
