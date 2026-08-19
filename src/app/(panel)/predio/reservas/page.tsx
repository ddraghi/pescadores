import { exigirCapacidad } from "@/lib/auth";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";
import { reservasDePredios } from "@/lib/datos/ocupacion";
import { ReservaPrioritaria } from "./cliente";
import { prisma } from "@/lib/prisma";

const ESTADOS: Record<string, string> = {
  ACTIVA: "Reservado",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  AUSENTE: "No se presentó",
};

export default async function Pagina() {
  const sesion = await exigirCapacidad("administrar_predio");
  const suyos = prediosDelRolActivo(sesion);

  const [reservas, espacios, alojamientos] = await Promise.all([
    reservasDePredios(suyos),
    prisma.espacio.findMany({
      where: { activo: true, ...(suyos.length ? { predioId: { in: suyos } } : {}) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.alojamiento.findMany({
      where: { activo: true, ...(suyos.length ? { predioId: { in: suyos } } : {}) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const ahora = new Date();

  return (
    <>
      <EncabezadoPantalla
        titulo="Reservas"
        descripcion="Lo que los socios tienen tomado en tu predio. Podés reservar por encima de la disponibilidad pública para un evento del club o un mantenimiento."
        accion={<ReservaPrioritaria espacios={espacios} alojamientos={alojamientos} />}
      />

      <Tabla>
        <Encabezados>
          <Th>Qué</Th>
          <Th>Quién</Th>
          <Th>Cuándo</Th>
          <Th className="text-right">Personas</Th>
          <Th>Estado</Th>
        </Encabezados>
        <Filas>
          {reservas.length === 0 && <Vacio columnas={5}>Todavía no hay reservas en tu predio.</Vacio>}
          {reservas.map((r) => {
            const que = r.alojamiento?.nombre ?? r.espacio?.nombre ?? "Reserva";
            const predio = r.alojamiento?.predio.nombre ?? r.espacio?.predio.nombre ?? "";
            const pasada = r.hasta < ahora;
            return (
              <tr key={r.id} className={pasada ? "opacity-60" : undefined}>
                <Td>
                  <div className="font-medium">{que}</div>
                  <div className="text-xs text-muted-foreground">{predio}</div>
                </Td>
                <Td>
                  {r.socio.persona.nombre}
                  {r.prioritaria && <div className="text-[11px] text-marca">reserva del predio</div>}
                </Td>
                <Td className="text-sm">
                  {r.desde.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                  <div className="text-xs text-muted-foreground">
                    hasta {r.hasta.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{r.personas}</Td>
                <Td>
                  <Pastilla tono={r.estado === "CANCELADA" ? "inactivo" : "activo"}>
                    {ESTADOS[r.estado] ?? r.estado}
                  </Pastilla>
                </Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>
    </>
  );
}
