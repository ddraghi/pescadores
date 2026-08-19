import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { MEDIOS_PAGO, type NombreMedioPago } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

/** Lo que cobró esta persona, en todos sus turnos. No ve lo de los demás porteros. */
export default async function Pagina() {
  const sesion = await exigirCapacidad('cobrar');

  const cobros = await prisma.cobro.findMany({
    where: { operadorId: sesion.personaId },
    orderBy: { ocurridoEn: 'desc' },
    take: 100,
    include: { predio: { select: { nombre: true } } },
  });

  const total = cobros.reduce((s, c) => s + Number(c.total), 0);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mis movimientos"
        descripcion="Los últimos cobros que registraste."
      />

      <div className="mb-5 inline-block rounded-md border border-border bg-card px-3 py-2">
        <div className="text-lg font-bold tabular-nums">{pesos(total)}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {cobros.length} cobros
        </div>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Fecha</Th>
          <Th>Cobrado a</Th>
          <Th>Medio</Th>
          <Th>Predio</Th>
          <Th className="text-right">Importe</Th>
        </Encabezados>
        <Filas>
          {cobros.length === 0 && <Vacio columnas={5}>Todavía no registraste ningún cobro.</Vacio>}
          {cobros.map((c) => (
            <tr key={c.id}>
              <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {c.ocurridoEn.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
              </Td>
              <Td className="font-medium">{c.pagador}</Td>
              <Td>
                <Pastilla>{MEDIOS_PAGO[c.medioPago as NombreMedioPago] ?? c.medioPago}</Pastilla>
              </Td>
              <Td className="text-sm text-muted-foreground">{c.predio.nombre}</Td>
              <Td className="text-right font-medium tabular-nums">{pesos(Number(c.total))}</Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
