import Link from 'next/link';
import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Button } from '@/components/ui/button';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { MEDIOS_PAGO, type NombreMedioPago } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

const POR_PAGINA = 40;

interface LineaCobro {
  concepto?: string;
  periodo?: string;
  importe?: number;
}

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirCapacidad('ver_cobranzas');

  const sp = await searchParams;
  const pagina = Number(Array.isArray(sp.pagina) ? sp.pagina[0] : sp.pagina) || 1;

  const [cobros, total, porMedio] = await Promise.all([
    prisma.cobro.findMany({
      orderBy: { ocurridoEn: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        predio: { select: { nombre: true } },
        operador: { select: { nombre: true } },
      },
    }),
    prisma.cobro.count(),
    prisma.cobro.groupBy({ by: ['medioPago'], _sum: { total: true }, _count: true }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const recaudado = porMedio.reduce((s, m) => s + Number(m._sum.total ?? 0), 0);

  return (
    <>
      <EncabezadoPantalla
        titulo="Cobros"
        descripcion="Todo lo que entró, venga de la portería, de un cobrador a domicilio o de Tesorería."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{pesos(recaudado)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Recaudado
          </div>
        </div>
        {porMedio.map((m) => (
          <div key={m.medioPago} className="rounded-md border border-border bg-card px-3 py-2">
            <div className="text-lg font-bold tabular-nums">{pesos(Number(m._sum.total ?? 0))}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {MEDIOS_PAGO[m.medioPago as NombreMedioPago]} · {m._count}
            </div>
          </div>
        ))}
      </div>

      <Tabla>
        <Encabezados>
          <Th>Fecha</Th>
          <Th>Pagador</Th>
          <Th>Detalle</Th>
          <Th>Medio</Th>
          <Th>Predio</Th>
          <Th>Cobró</Th>
          <Th className="text-right">Importe</Th>
        </Encabezados>
        <Filas>
          {cobros.length === 0 && <Vacio columnas={7}>Todavía no se registró ningún cobro.</Vacio>}

          {cobros.map((c) => {
            const lineas = (Array.isArray(c.items) ? c.items : []) as LineaCobro[];
            return (
              <tr key={c.id}>
                <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {c.ocurridoEn.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </Td>
                <Td className="font-medium">{c.pagador}</Td>
                <Td className="text-sm text-muted-foreground">
                  {lineas.map((l, i) => (
                    <div key={i}>{l.concepto}</div>
                  ))}
                </Td>
                <Td>
                  <Pastilla>{MEDIOS_PAGO[c.medioPago as NombreMedioPago] ?? c.medioPago}</Pastilla>
                  {c.offline && (
                    <div className="mt-0.5 text-[11px] text-marca">cobrado sin enlace</div>
                  )}
                </Td>
                <Td className="text-sm text-muted-foreground">{c.predio.nombre}</Td>
                <Td className="text-sm text-muted-foreground">{c.operador.nombre}</Td>
                <Td className="text-right font-medium tabular-nums">{pesos(Number(c.total))}</Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total.toLocaleString('es-AR')} cobros · página {pagina} de {paginas}
        </p>
        <div className="flex gap-2">
          {pagina > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?pagina=${pagina - 1}`}>Anterior</Link>
            </Button>
          )}
          {pagina < paginas && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?pagina=${pagina + 1}`}>Siguiente</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
