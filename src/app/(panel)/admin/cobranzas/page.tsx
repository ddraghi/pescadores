import { EstadoCuota, EstadoSocio } from '@prisma/client';
import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from '@/components/panel/tabla';
import { MEDIOS_PAGO, nombrePeriodo, type NombreMedioPago } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

/**
 * Cobranzas para el Administrador General: sólo lectura. Quien opera el dinero es
 * Tesorería (arts. 46 y 47); el Administrador necesita ver cómo viene el mes.
 */
export default async function Pagina() {
  await exigirCapacidad('ver_cobranzas');

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [ingresos, egresos, deuda, emplazados, porMedio, porPeriodo] = await Promise.all([
    prisma.cobro.aggregate({ where: { ocurridoEn: { gte: inicioMes } }, _sum: { total: true }, _count: true }),
    prisma.egreso.aggregate({ where: { fecha: { gte: inicioMes } }, _sum: { monto: true } }),
    prisma.cuota.aggregate({
      where: { estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] } },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.socio.count({ where: { estado: EstadoSocio.EMPLAZADO } }),
    prisma.cobro.groupBy({
      by: ['medioPago'],
      where: { ocurridoEn: { gte: inicioMes } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.cuota.groupBy({
      by: ['periodo', 'estado'],
      _sum: { monto: true },
      orderBy: { periodo: 'desc' },
      take: 24,
    }),
  ]);

  const entrada = Number(ingresos._sum.total ?? 0);
  const salida = Number(egresos._sum.monto ?? 0);

  // Cobrado contra pendiente, por período.
  const periodos = new Map<string, { cobrado: number; pendiente: number }>();
  for (const p of porPeriodo) {
    const fila = periodos.get(p.periodo) ?? { cobrado: 0, pendiente: 0 };
    const monto = Number(p._sum.monto ?? 0);
    if (p.estado === EstadoCuota.PAGADA) fila.cobrado += monto;
    else if (p.estado !== EstadoCuota.CONDONADA) fila.pendiente += monto;
    periodos.set(p.periodo, fila);
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Cobranzas"
        descripcion="Cómo viene el mes. Sólo lectura: quien opera el dinero es Tesorería."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        {[
          [pesos(entrada), `Ingresos del mes · ${ingresos._count} cobros`, true],
          [pesos(salida), 'Egresos del mes', false],
          [pesos(entrada - salida), 'Resultado del mes', false],
          [pesos(Number(deuda._sum.monto ?? 0)), `Por cobrar · ${deuda._count} cuotas`, false],
          [String(emplazados), 'Socios emplazados', false],
        ].map(([valor, etiqueta, destacado]) => (
          <div
            key={etiqueta as string}
            className={`rounded-md border px-4 py-3 ${
              destacado ? 'border-accent/40 bg-accent/10' : 'border-border bg-card'
            }`}
          >
            <div className="text-xl font-bold tabular-nums">{valor}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {etiqueta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cuotas por período</CardTitle>
            <CardDescription>Cuánto se cobró y cuánto queda pendiente de cada mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Período</Th>
                <Th className="text-right">Cobrado</Th>
                <Th className="text-right">Pendiente</Th>
              </Encabezados>
              <Filas>
                {periodos.size === 0 && <Vacio columnas={3}>Todavía no se generaron cuotas.</Vacio>}
                {[...periodos.entries()].map(([periodo, f]) => (
                  <tr key={periodo}>
                    <Td>{nombrePeriodo(periodo)}</Td>
                    <Td className="text-right tabular-nums">{pesos(f.cobrado)}</Td>
                    <Td className="text-right tabular-nums text-marca">{pesos(f.pendiente)}</Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medios de pago del mes</CardTitle>
            <CardDescription>Cómo está cobrando el club.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Medio</Th>
                <Th className="text-right">Cobros</Th>
                <Th className="text-right">Importe</Th>
              </Encabezados>
              <Filas>
                {porMedio.length === 0 && <Vacio columnas={3}>Sin cobros este mes.</Vacio>}
                {porMedio.map((m) => (
                  <tr key={m.medioPago}>
                    <Td>{MEDIOS_PAGO[m.medioPago as NombreMedioPago] ?? m.medioPago}</Td>
                    <Td className="text-right tabular-nums">{m._count}</Td>
                    <Td className="text-right tabular-nums">{pesos(Number(m._sum.total ?? 0))}</Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
