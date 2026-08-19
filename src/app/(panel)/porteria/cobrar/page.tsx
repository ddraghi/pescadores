import { EstadoCaja } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { CobrarCliente, type ConceptoDisponible } from "./cliente";

export default async function Pagina() {
  const sesion = await exigirCapacidad("cobrar");

  const caja = await prisma.caja.findFirst({
    where: { personaId: sesion.personaId, estado: EstadoCaja.ABIERTA },
    include: { predio: { select: { id: true, nombre: true } } },
  });

  let conceptos: ConceptoDisponible[] = [];
  if (caja) {
    const hoy = new Date();
    // Los precios de este predio y los que valen para todos, vigentes hoy.
    const items = await prisma.itemTarifario.findMany({
      where: {
        OR: [{ predioId: caja.predio.id }, { predioId: null }],
        vigenciaDesde: { lte: hoy },
        AND: [{ OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: hoy } }] }],
        categoriaSocio: null,
      },
      orderBy: [{ concepto: "asc" }, { vigenciaDesde: "desc" }],
    });

    const mapa = new Map<string, Record<string, number>>();
    for (const i of items) {
      const precios = mapa.get(i.concepto) ?? {};
      // El primero que aparece gana: vienen ordenados por vigencia descendente.
      if (precios[i.condicion] === undefined) precios[i.condicion] = Number(i.precio);
      mapa.set(i.concepto, precios);
    }
    conceptos = [...mapa.entries()].map(([concepto, precios]) => ({ concepto, precios }));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <EncabezadoPantalla
        titulo="Cobrar"
        descripcion="Conceptos del tarifario que se cobran en el mostrador: quinchos, bajada de lancha, derecho de pileta, revisación de enfermería."
      />
      <CobrarCliente conceptos={conceptos} predioNombre={caja?.predio.nombre ?? null} />
    </div>
  );
}
