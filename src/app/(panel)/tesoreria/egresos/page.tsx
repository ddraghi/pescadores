import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { pesos } from '@/lib/utils';
import { EgresosCliente } from './cliente';

export default async function Pagina() {
  await exigirCapacidad('administrar_egresos');

  const [egresos, predios, suma] = await Promise.all([
    prisma.egreso.findMany({
      orderBy: { fecha: 'desc' },
      take: 200,
      include: { predio: { select: { nombre: true } } },
    }),
    prisma.predio.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true },
    }),
    prisma.egreso.aggregate({ _sum: { monto: true } }),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Egresos"
        descripcion="Planilla de gastos del club. Por ahora es simple a propósito: fecha, concepto, monto y comprobante."
      />

      <div className="mb-5 rounded-md border border-border bg-card px-3 py-2 inline-block">
        <div className="text-lg font-bold tabular-nums">{pesos(Number(suma._sum.monto ?? 0))}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Total registrado
        </div>
      </div>

      <EgresosCliente
        predios={predios}
        egresos={egresos.map((e) => ({
          id: e.id,
          fecha: e.fecha.toISOString().slice(0, 10),
          concepto: e.concepto,
          monto: Number(e.monto),
          predioId: e.predioId,
          predioNombre: e.predio?.nombre ?? null,
          comprobante: e.comprobante,
        }))}
      />
    </>
  );
}
