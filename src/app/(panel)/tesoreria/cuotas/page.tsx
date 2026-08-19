import Link from 'next/link';
import { EstadoCuota, Prisma } from '@prisma/client';
import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Button } from '@/components/ui/button';
import { ESTADOS_CUOTA, nombrePeriodo } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';
import { AccionesCuotas, TablaCuotas } from './cliente';

const POR_PAGINA = 30;

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirCapacidad('administrar_cuotas');

  const sp = await searchParams;
  const unico = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const periodo = unico(sp.periodo);
  const estado = unico(sp.estado);
  const pagina = Number(unico(sp.pagina)) || 1;

  const where: Prisma.CuotaWhereInput = {
    ...(periodo ? { periodo } : {}),
    ...(estado && estado in EstadoCuota ? { estado: estado as EstadoCuota } : {}),
  };

  const [cuotas, total, periodos, resumen] = await Promise.all([
    prisma.cuota.findMany({
      where,
      orderBy: [{ periodo: 'desc' }, { socio: { numeroSocio: 'asc' } }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { socio: { include: { persona: { select: { nombre: true } } } } },
    }),
    prisma.cuota.count({ where }),
    prisma.cuota.groupBy({ by: ['periodo'], orderBy: { periodo: 'desc' }, take: 24 }),
    prisma.cuota.groupBy({ by: ['estado'], where, _count: true, _sum: { monto: true } }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const url = (p: number) =>
    `?${new URLSearchParams({ periodo, estado, pagina: String(p) }).toString()}`;

  return (
    <>
      <EncabezadoPantalla
        titulo="Cuotas"
        descripcion="Generación mensual y estado de cobro. Quién paga y cuánto sale del tarifario: si una categoría no tiene precio cargado, no se le genera cuota."
        accion={<AccionesCuotas />}
      />

      {resumen.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {resumen.map((r) => (
            <div key={r.estado} className="rounded-md border border-border bg-card px-3 py-2">
              <div className="text-lg font-bold tabular-nums">
                {pesos(Number(r._sum.monto ?? 0))}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {ESTADOS_CUOTA[r.estado]} · {r._count}
              </div>
            </div>
          ))}
        </div>
      )}

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-52">
          <label htmlFor="periodo" className="mb-1.5 block text-sm font-medium">
            Período
          </label>
          <select
            id="periodo"
            name="periodo"
            defaultValue={periodo}
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="">Todos</option>
            {periodos.map((p) => (
              <option key={p.periodo} value={p.periodo}>
                {nombrePeriodo(p.periodo)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label htmlFor="estado" className="mb-1.5 block text-sm font-medium">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado}
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(ESTADOS_CUOTA).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <TablaCuotas
        cuotas={cuotas.map((c) => ({
          id: c.id,
          periodo: c.periodo,
          concepto: c.concepto,
          monto: Number(c.monto),
          estado: c.estado,
          vencimiento: c.vencimiento.toISOString().slice(0, 10),
          socioNombre: c.socio.persona.nombre,
          numeroSocio: c.socio.numeroSocio,
        }))}
      />

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total.toLocaleString('es-AR')} cuotas · página {pagina} de {paginas}
        </p>
        <div className="flex gap-2">
          {pagina > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={url(pagina - 1)}>Anterior</Link>
            </Button>
          )}
          {pagina < paginas && (
            <Button variant="outline" size="sm" asChild>
              <Link href={url(pagina + 1)}>Siguiente</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
