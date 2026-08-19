import { CategoriaSocio } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { BarrioCliente } from "./cliente";

const DIA = 86400000;

export default async function Pagina() {
  await exigirCapacidad("actos_estatutarios");
  const ahora = new Date();

  const [lotes, autorizaciones, predios, socios] = await Promise.all([
    prisma.lote.findMany({
      orderBy: [{ predio: { orden: "asc" } }, { numero: "asc" }],
      include: {
        predio: { select: { nombre: true } },
        adjudicatario: { include: { persona: { select: { nombre: true } } } },
        _count: { select: { autorizaciones: { where: { hasta: { gte: ahora } } } } },
      },
    }),
    prisma.autorizacionEstadia.findMany({
      orderBy: { desde: "desc" },
      take: 60,
      include: {
        lote: {
          include: { adjudicatario: { include: { persona: { select: { nombre: true } } } } },
        },
      },
    }),
    prisma.predio.findMany({ where: { activo: true }, orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.socio.findMany({
      where: { categoria: { in: [CategoriaSocio.ACTIVO, CategoriaSocio.VITALICIO] } },
      orderBy: { numeroSocio: "asc" },
      take: 500,
      include: { persona: { select: { nombre: true } } },
    }),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Barrio de fin de semana"
        descripcion="Los lotes del Nihuil que el club cede en concesión precaria, y los permisos para que terceros usen las viviendas."
      />
      <BarrioCliente
        predios={predios}
        socios={socios.map((s) => ({ id: s.id, nombre: s.persona.nombre, numeroSocio: s.numeroSocio }))}
        lotes={lotes.map((l) => ({
          id: l.id,
          numero: l.numero,
          fila: l.fila,
          predioId: l.predioId,
          predioNombre: l.predio.nombre,
          adjudicatarioId: l.adjudicatarioId,
          adjudicatarioNombre: l.adjudicatario?.persona.nombre ?? null,
          fechaAdjudicacion: l.fechaAdjudicacion?.toISOString().slice(0, 10) ?? null,
          autorizacionesVigentes: l._count.autorizaciones,
        }))}
        autorizaciones={autorizaciones.map((a) => ({
          id: a.id,
          lote: a.lote.numero,
          adjudicatario: a.lote.adjudicatario?.persona.nombre ?? "sin adjudicar",
          personas: a.personas,
          desde: a.desde.toISOString().slice(0, 10),
          hasta: a.hasta.toISOString().slice(0, 10),
          dias: Math.ceil((a.hasta.getTime() - a.desde.getTime()) / DIA),
          aprobada: a.aprobada,
          vencida: a.hasta < ahora,
        }))}
      />
    </>
  );
}
