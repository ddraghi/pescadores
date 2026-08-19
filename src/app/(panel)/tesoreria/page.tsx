import Link from 'next/link';
import { EstadoCaja, EstadoCuota, EstadoSocio } from '@prisma/client';
import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from '@/components/panel/tabla';
import { MEDIOS_PAGO, type NombreMedioPago } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

function Indicador({
  valor,
  etiqueta,
  destacado,
  href,
}: {
  valor: string;
  etiqueta: string;
  destacado?: boolean;
  href?: string;
}) {
  const contenido = (
    <div
      className={`rounded-md border px-4 py-3 ${
        destacado ? 'border-accent/40 bg-accent/10' : 'border-border bg-card'
      }`}
    >
      <div className="text-xl font-bold tabular-nums">{valor}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{etiqueta}</div>
    </div>
  );
  return href ? <Link href={href}>{contenido}</Link> : contenido;
}

export default async function Pagina() {
  await exigirCapacidad('ver_cobranzas');

  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [delDia, delMes, egresosMes, deuda, emplazados, cajasAbiertas, porMedioHoy] =
    await Promise.all([
      prisma.cobro.aggregate({ where: { ocurridoEn: { gte: inicioDia } }, _sum: { total: true }, _count: true }),
      prisma.cobro.aggregate({ where: { ocurridoEn: { gte: inicioMes } }, _sum: { total: true } }),
      prisma.egreso.aggregate({ where: { fecha: { gte: inicioMes } }, _sum: { monto: true } }),
      prisma.cuota.aggregate({
        where: { estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] } },
        _sum: { monto: true },
        _count: true,
      }),
      prisma.socio.count({ where: { estado: EstadoSocio.EMPLAZADO } }),
      prisma.caja.findMany({
        where: { estado: EstadoCaja.ABIERTA },
        include: {
          persona: { select: { nombre: true } },
          predio: { select: { nombre: true } },
          cobros: { select: { total: true } },
        },
      }),
      prisma.cobro.groupBy({
        by: ['medioPago'],
        where: { ocurridoEn: { gte: inicioDia } },
        _sum: { total: true },
      }),
    ]);

  const ingresosMes = Number(delMes._sum.total ?? 0);
  const salidasMes = Number(egresosMes._sum.monto ?? 0);

  return (
    <>
      <EncabezadoPantalla
        titulo="Tesorería"
        descripcion="Lo que entró y lo que salió, y quién está debiendo."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Indicador valor={pesos(Number(delDia._sum.total ?? 0))} etiqueta={`Hoy · ${delDia._count} cobros`} destacado />
        <Indicador valor={pesos(ingresosMes)} etiqueta="Ingresos del mes" href="/tesoreria/cobros" />
        <Indicador valor={pesos(salidasMes)} etiqueta="Egresos del mes" href="/tesoreria/egresos" />
        <Indicador valor={pesos(ingresosMes - salidasMes)} etiqueta="Resultado del mes" />
        <Indicador
          valor={pesos(Number(deuda._sum.monto ?? 0))}
          etiqueta={`Por cobrar · ${deuda._count} cuotas`}
          href="/tesoreria/morosos"
        />
        <Indicador valor={String(emplazados)} etiqueta="Socios emplazados" href="/tesoreria/morosos" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cajas abiertas ahora</CardTitle>
            <CardDescription>
              Turnos sin cerrar. Mientras la caja siga abierta, lo cobrado no está arqueado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Quién</Th>
                <Th>Dónde</Th>
                <Th className="text-right">Cobrado</Th>
              </Encabezados>
              <Filas>
                {cajasAbiertas.length === 0 && (
                  <Vacio columnas={3}>No hay ninguna caja abierta.</Vacio>
                )}
                {cajasAbiertas.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-medium">{c.persona.nombre}</Td>
                    <Td className="text-sm text-muted-foreground">{c.predio.nombre}</Td>
                    <Td className="text-right tabular-nums">
                      {pesos(c.cobros.reduce((s, x) => s + Number(x.total), 0))}
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hoy, por medio de pago</CardTitle>
            <CardDescription>Cómo se compone la recaudación del día.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Medio</Th>
                <Th className="text-right">Importe</Th>
              </Encabezados>
              <Filas>
                {porMedioHoy.length === 0 && <Vacio columnas={2}>Todavía no se cobró nada hoy.</Vacio>}
                {porMedioHoy.map((m) => (
                  <tr key={m.medioPago}>
                    <Td>{MEDIOS_PAGO[m.medioPago as NombreMedioPago] ?? m.medioPago}</Td>
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
