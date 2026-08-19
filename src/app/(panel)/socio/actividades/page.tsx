import Link from "next/link";
import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from "@/components/panel/tabla";

/**
 * Todas las actividades del club, con el predio donde se dicta cada una.
 *
 * Están también adentro de cada predio, a propósito: el socio las vive como algo suyo
 * —«mi hijo hace fútbol»— y no siempre se acuerda en qué predio es.
 */
export default async function Pagina() {
  await exigirCapacidad("panel_socio");

  const actividades = await prisma.actividad.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: { predios: { include: { predio: { select: { nombre: true, slug: true, orden: true } } } } },
  });

  return (
    <>
      <EncabezadoPantalla
        titulo="Actividades del club"
        descripcion="Todo lo que se dicta, y dónde. Para inscribirte, consultá en el predio."
      />
      <Tabla>
        <Encabezados>
          <Th>Actividad</Th>
          <Th>Se cobra</Th>
          <Th>Dónde</Th>
        </Encabezados>
        <Filas>
          {actividades.length === 0 && <Vacio columnas={3}>Todavía no hay actividades cargadas.</Vacio>}
          {actividades.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.nombre}</Td>
              <Td className="text-sm text-muted-foreground">
                {a.modalidad === "mensual" ? "Por mes" : "Por turno"}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {[...a.predios].sort((x, y) => x.predio.orden - y.predio.orden).map((p) => (
                    <Link
                      key={p.predioId}
                      href={`/socio/predio/${p.predio.slug}`}
                      className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs hover:border-accent"
                    >
                      {p.predio.nombre}
                    </Link>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
