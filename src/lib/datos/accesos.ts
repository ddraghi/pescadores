import "server-only";
import { EstadoCaja, TipoAcceso } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Sesion } from "@/lib/auth";
import { prediosDelRolActivo } from "@/lib/sesion";
import type { AccesoOperable } from "@/components/panel/puesto-acceso";

/**
 * Los puestos que esta persona puede operar: los de su predio, del tipo que le
 * corresponde a su rol. Un portero no ve los puntos de control y viceversa.
 */
export async function accesosOperables(sesion: Sesion, tipo: TipoAcceso): Promise<AccesoOperable[]> {
  const suyos = prediosDelRolActivo(sesion);
  const accesos = await prisma.acceso.findMany({
    where: {
      activo: true,
      tipo,
      ...(suyos.length ? { predioId: { in: suyos } } : {}),
    },
    orderBy: [{ predio: { orden: "asc" } }, { nombre: "asc" }],
    include: { predio: { select: { nombre: true } } },
  });

  return accesos.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    tipo: a.tipo,
    predioNombre: a.predio.nombre,
  }));
}

export async function tieneCajaAbierta(personaId: string): Promise<boolean> {
  const caja = await prisma.caja.findFirst({
    where: { personaId, estado: EstadoCaja.ABIERTA },
    select: { id: true },
  });
  return Boolean(caja);
}
