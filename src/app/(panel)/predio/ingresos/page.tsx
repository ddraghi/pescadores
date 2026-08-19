import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { RegistroDeIngresos } from "@/components/panel/registro-ingresos";
import { pesos } from "@/lib/utils";

/** Todo lo que pasó por los puestos del predio, porterías y controles juntos. */
export default async function Pagina() {
  const sesion = await exigirCapacidad("administrar_predio");
  const suyos = prediosDelRolActivo(sesion);
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const donde = suyos.length ? { predioId: { in: suyos } } : {};

  const [ingresos, hoyTotal, hoyRechazos] = await Promise.all([
    prisma.ingreso.findMany({
      where: donde,
      orderBy: { ocurridoEn: "desc" },
      take: 150,
      include: {
        acceso: { select: { nombre: true } },
        predio: { select: { nombre: true } },
        cobro: { select: { total: true } },
      },
    }),
    prisma.ingreso.count({ where: { ...donde, ocurridoEn: { gte: inicioDia } } }),
    prisma.ingreso.count({
      where: { ...donde, ocurridoEn: { gte: inicioDia }, resultado: "RECHAZADO" },
    }),
  ]);

  const recaudado = ingresos
    .filter((i) => i.ocurridoEn >= inicioDia && i.cobro)
    .reduce((s, i) => s + Number(i.cobro!.total), 0);

  return (
    <>
      <EncabezadoPantalla
        titulo="Ingresos"
        descripcion="Quién pasó por los puestos de tu predio, y quién no pudo pasar."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{hoyTotal}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Hoy</div>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="text-lg font-bold tabular-nums text-marca">{hoyRechazos}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">No pasaron</div>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{pesos(recaudado)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Cobrado hoy</div>
        </div>
      </div>

      <RegistroDeIngresos ingresos={ingresos.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        resultado: i.resultado,
        motivo: i.motivo,
        acceso: i.acceso.nombre,
        predio: i.predio.nombre,
        cuando: i.ocurridoEn.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
      }))} />
    </>
  );
}
