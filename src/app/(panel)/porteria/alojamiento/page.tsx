import { EstadoReserva } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";
import { inicioDelDia } from "@/lib/datos/ocupacion";

/** Quién entra y quién sale hoy del alojamiento del predio. */
export default async function Pagina() {
  const sesion = await exigirCapacidad("operar_porteria");
  const suyos = prediosDelRolActivo(sesion);
  const hoy = inicioDelDia();
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const donde = suyos.length ? { predioId: { in: suyos } } : {};

  const [entran, salen, adentro] = await Promise.all([
    prisma.reserva.findMany({
      where: { alojamiento: donde, estado: { in: [EstadoReserva.ACTIVA, EstadoReserva.CONFIRMADA] }, desde: { gte: hoy, lt: manana } },
      orderBy: { desde: "asc" },
      include: { socio: { include: { persona: { select: { nombre: true } } } }, alojamiento: true },
    }),
    prisma.reserva.findMany({
      where: { alojamiento: donde, estado: { in: [EstadoReserva.ACTIVA, EstadoReserva.CONFIRMADA] }, hasta: { gte: hoy, lt: manana } },
      orderBy: { hasta: "asc" },
      include: { socio: { include: { persona: { select: { nombre: true } } } }, alojamiento: true },
    }),
    prisma.reserva.findMany({
      where: { alojamiento: donde, estado: { in: [EstadoReserva.ACTIVA, EstadoReserva.CONFIRMADA] }, desde: { lt: hoy }, hasta: { gte: manana } },
      include: { socio: { include: { persona: { select: { nombre: true } } } }, alojamiento: true },
    }),
  ]);

  function tabla(titulo: string, filas: typeof entran, vacio: string) {
    return (
      <>
        <h2 className="mb-2 mt-6 text-sm font-medium first:mt-0">{titulo}</h2>
        <Tabla>
          <Encabezados>
            <Th>Alojamiento</Th>
            <Th>Socio</Th>
            <Th className="text-right">Personas</Th>
            <Th>Hasta</Th>
          </Encabezados>
          <Filas>
            {filas.length === 0 && <Vacio columnas={4}>{vacio}</Vacio>}
            {filas.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.alojamiento?.nombre}</Td>
                <Td>{r.socio.persona.nombre}</Td>
                <Td className="text-right tabular-nums">{r.personas}</Td>
                <Td className="text-sm text-muted-foreground">
                  {r.hasta.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </Td>
              </tr>
            ))}
          </Filas>
        </Tabla>
      </>
    );
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Alojamiento"
        descripcion="Quién llega, quién se va y quién está adentro hoy."
      />
      <div className="mb-4">
        <Pastilla tono="activo">{entran.length} entradas</Pastilla>{" "}
        <Pastilla>{salen.length} salidas</Pastilla>{" "}
        <Pastilla>{adentro.length} alojados</Pastilla>
      </div>
      {tabla("Entran hoy", entran, "Nadie llega hoy.")}
      {tabla("Salen hoy", salen, "Nadie se va hoy.")}
      {tabla("Están alojados", adentro, "No hay nadie alojado.")}
    </>
  );
}
