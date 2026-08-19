import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from "@/components/panel/tabla";
import { FichajeCliente } from "./cliente";

export default async function Pagina() {
  const sesion = await exigirCapacidad("fichar");
  const suyos = prediosDelRolActivo(sesion);

  const [abierto, ultimos, predios] = await Promise.all([
    prisma.fichaje.findFirst({
      where: { personaId: sesion.personaId, salida: null },
      orderBy: { entrada: "desc" },
      include: { predio: { select: { nombre: true } } },
    }),
    prisma.fichaje.findMany({
      where: { personaId: sesion.personaId },
      orderBy: { entrada: "desc" },
      take: 20,
      include: { predio: { select: { nombre: true } } },
    }),
    prisma.predio.findMany({
      where: { activo: true, ...(suyos.length ? { id: { in: suyos } } : {}) },
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  return (
    <>
      <EncabezadoPantalla titulo="Fichaje" descripcion="Marcá tu entrada y tu salida." />

      <FichajeCliente
        predios={predios}
        abierto={abierto ? { predio: abierto.predio.nombre, desde: abierto.entrada.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) } : null}
      />

      <h2 className="mb-2 mt-6 text-sm font-medium">Últimas marcas</h2>
      <Tabla>
        <Encabezados>
          <Th>Entrada</Th>
          <Th>Salida</Th>
          <Th>Predio</Th>
          <Th className="text-right">Horas</Th>
        </Encabezados>
        <Filas>
          {ultimos.length === 0 && <Vacio columnas={4}>Todavía no fichaste nunca.</Vacio>}
          {ultimos.map((f) => {
            const horas = f.salida ? (f.salida.getTime() - f.entrada.getTime()) / 3600000 : null;
            return (
              <tr key={f.id}>
                <Td className="font-mono text-xs">{f.entrada.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</Td>
                <Td className="font-mono text-xs text-muted-foreground">
                  {f.salida ? f.salida.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "sin cerrar"}
                </Td>
                <Td className="text-sm text-muted-foreground">{f.predio.nombre}</Td>
                <Td className="text-right tabular-nums">{horas ? horas.toFixed(1) : "—"}</Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>
    </>
  );
}
