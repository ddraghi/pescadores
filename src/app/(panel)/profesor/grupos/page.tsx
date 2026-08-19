import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { gruposDelProfesor, sociosParaInscribir } from "@/lib/datos/grupos";
import { GruposCliente } from "./cliente";

export default async function Pagina() {
  const sesion = await exigirCapacidad("administrar_grupos");

  const [grupos, actividades, predios, socios] = await Promise.all([
    gruposDelProfesor(sesion.personaId),
    prisma.actividad.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.predio.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    sociosParaInscribir(),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mis grupos"
        descripcion="Los grupos que dictás, con sus horarios y sus alumnos. Las actividades las define Secretaría; los grupos los armás vos."
      />
      <GruposCliente grupos={grupos} actividades={actividades} predios={predios} socios={socios} />
    </>
  );
}
