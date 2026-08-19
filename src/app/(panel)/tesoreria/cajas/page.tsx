import { EstadoCaja } from '@prisma/client';
import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { MEDIOS_PAGO, type NombreMedioPago } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

interface Arqueo {
  registrado?: Record<string, number>;
  declarado?: Record<string, number>;
  diferencias?: Record<string, number>;
  observaciones?: string;
}

export default async function Pagina() {
  await exigirCapacidad('arquear_cajas');

  const cajas = await prisma.caja.findMany({
    orderBy: { abiertaEn: 'desc' },
    take: 60,
    include: {
      persona: { select: { nombre: true } },
      predio: { select: { nombre: true } },
      acceso: { select: { nombre: true } },
      cobros: { select: { total: true } },
    },
  });

  const abiertas = cajas.filter((c) => c.estado === EstadoCaja.ABIERTA);

  return (
    <>
      <EncabezadoPantalla
        titulo="Cajas y arqueos"
        descripcion="Cada turno de portería o de cobranza es una caja. Al cerrarla se declara lo que hay de cada medio de pago, y la diferencia con lo registrado queda asentada."
      />

      {abiertas.length > 0 && (
        <div className="mb-5 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <strong className="text-marca">
            {abiertas.length} {abiertas.length === 1 ? 'caja abierta' : 'cajas abiertas'}
          </strong>
          {': '}
          {abiertas.map((c) => `${c.persona.nombre} en ${c.predio.nombre}`).join(' · ')}
        </div>
      )}

      <Tabla>
        <Encabezados>
          <Th>Turno</Th>
          <Th>Quién</Th>
          <Th>Dónde</Th>
          <Th className="text-right">Cobros</Th>
          <Th className="text-right">Registrado</Th>
          <Th>Arqueo</Th>
        </Encabezados>
        <Filas>
          {cajas.length === 0 && (
            <Vacio columnas={6}>Todavía no se abrió ninguna caja.</Vacio>
          )}

          {cajas.map((c) => {
            const registrado = c.cobros.reduce((s, x) => s + Number(x.total), 0);
            const arqueo = (c.arqueo ?? null) as Arqueo | null;
            const diferencias = Object.entries(arqueo?.diferencias ?? {}).filter(([, v]) => v !== 0);

            return (
              <tr key={c.id}>
                <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {c.abiertaEn.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  {c.cerradaEn && (
                    <div>
                      a {c.cerradaEn.toLocaleTimeString('es-AR', { timeStyle: 'short' })}
                    </div>
                  )}
                </Td>
                <Td className="font-medium">{c.persona.nombre}</Td>
                <Td className="text-sm text-muted-foreground">
                  {c.predio.nombre}
                  {c.acceso && <div className="text-xs">{c.acceso.nombre}</div>}
                </Td>
                <Td className="text-right tabular-nums">{c.cobros.length}</Td>
                <Td className="text-right font-medium tabular-nums">{pesos(registrado)}</Td>
                <Td>
                  {c.estado === EstadoCaja.ABIERTA ? (
                    <Pastilla tono="activo">Abierta</Pastilla>
                  ) : diferencias.length === 0 ? (
                    <Pastilla>Sin diferencias</Pastilla>
                  ) : (
                    <div>
                      <Pastilla tono="inactivo">Con diferencia</Pastilla>
                      <div className="mt-1 space-y-0.5">
                        {diferencias.map(([medio, valor]) => (
                          <div key={medio} className="text-xs text-marca">
                            {MEDIOS_PAGO[medio as NombreMedioPago] ?? medio}:{' '}
                            {valor > 0 ? '+' : ''}
                            {pesos(valor)}
                          </div>
                        ))}
                      </div>
                      {arqueo?.observaciones && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {arqueo.observaciones}
                        </div>
                      )}
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>
    </>
  );
}
