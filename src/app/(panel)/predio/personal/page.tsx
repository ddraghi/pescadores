import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";

/** Quién está trabajando ahora y las marcas de los últimos días. */
export default async function Pagina() {
  const sesion = await exigirCapacidad("ver_personal");
  const suyos = prediosDelRolActivo(sesion);
  const donde = suyos.length ? { predioId: { in: suyos } } : {};

  const desde = new Date();
  desde.setDate(desde.getDate() - 14);

  const [adentro, historial] = await Promise.all([
    prisma.fichaje.findMany({
      where: { ...donde, salida: null },
      orderBy: { entrada: "asc" },
      include: { persona: { select: { nombre: true } }, predio: { select: { nombre: true } } },
    }),
    prisma.fichaje.findMany({
      where: { ...donde, entrada: { gte: desde } },
      orderBy: { entrada: "desc" },
      take: 100,
      include: { persona: { select: { nombre: true } }, predio: { select: { nombre: true } } },
    }),
  ]);

  const horasPorPersona = new Map<string, number>();
  for (const f of historial) {
    if (!f.salida) continue;
    const h = (f.salida.getTime() - f.entrada.getTime()) / 3600000;
    horasPorPersona.set(f.persona.nombre, (horasPorPersona.get(f.persona.nombre) ?? 0) + h);
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Personal"
        descripcion="Quién está trabajando ahora y las horas de las últimas dos semanas."
      />

      <h2 className="mb-2 text-sm font-medium">Fichados ahora</h2>
      <Tabla>
        <Encabezados>
          <Th>Persona</Th>
          <Th>Predio</Th>
          <Th>Desde</Th>
          <Th className="text-right">Lleva</Th>
        </Encabezados>
        <Filas>
          {adentro.length === 0 && <Vacio columnas={4}>No hay nadie fichado en este momento.</Vacio>}
          {adentro.map((f) => {
            const horas = (Date.now() - f.entrada.getTime()) / 3600000;
            return (
              <tr key={f.id}>
                <Td className="font-medium">{f.persona.nombre}</Td>
                <Td className="text-sm text-muted-foreground">{f.predio.nombre}</Td>
                <Td className="font-mono text-xs">{f.entrada.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</Td>
                <Td className="text-right tabular-nums">
                  {horas.toFixed(1)} h
                  {horas > 12 && <div className="text-[11px] text-marca">sin cerrar</div>}
                </Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>

      {horasPorPersona.size > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-medium">Horas de las últimas dos semanas</h2>
          <Tabla>
            <Encabezados>
              <Th>Persona</Th>
              <Th className="text-right">Horas</Th>
            </Encabezados>
            <Filas>
              {[...horasPorPersona.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, horas]) => (
                <tr key={nombre}>
                  <Td className="font-medium">{nombre}</Td>
                  <Td className="text-right tabular-nums">{horas.toFixed(1)}</Td>
                </tr>
              ))}
            </Filas>
          </Tabla>
        </>
      )}

      <h2 className="mb-2 mt-6 text-sm font-medium">Marcas recientes</h2>
      <Tabla>
        <Encabezados>
          <Th>Persona</Th>
          <Th>Entrada</Th>
          <Th>Salida</Th>
          <Th className="text-right">Horas</Th>
        </Encabezados>
        <Filas>
          {historial.length === 0 && <Vacio columnas={4}>Sin marcas en las últimas dos semanas.</Vacio>}
          {historial.map((f) => {
            const horas = f.salida ? (f.salida.getTime() - f.entrada.getTime()) / 3600000 : null;
            return (
              <tr key={f.id}>
                <Td>{f.persona.nombre}</Td>
                <Td className="font-mono text-xs">{f.entrada.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</Td>
                <Td className="font-mono text-xs text-muted-foreground">
                  {f.salida ? f.salida.toLocaleTimeString("es-AR", { timeStyle: "short" }) : <Pastilla tono="neutro">abierta</Pastilla>}
                </Td>
                <Td className="text-right tabular-nums">{horas ? horas.toFixed(1) : "—"}</Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>
    </>
  );
}
