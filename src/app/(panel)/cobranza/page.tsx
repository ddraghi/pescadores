import Link from 'next/link';
import { exigirCapacidad } from '@/lib/auth';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Button } from '@/components/ui/button';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { CobrarCuotas } from '@/components/panel/cobrar-cuotas';
import { listarDeudores, cajaAbiertaDe, prediosActivos } from '@/lib/datos/deudores';
import { ESTADOS, type NombreEstado } from '@/lib/socios';
import { pesos } from '@/lib/utils';

/**
 * Cartera del cobrador: sólo los socios que Tesorería le asignó. No ve el padrón ni las
 * cuotas de nadie más — su rol habilita cobrar a domicilio, y nada más.
 */
export default async function Pagina() {
  const sesion = await exigirCapacidad('cobrar_domicilio');

  const [deudores, caja, predios] = await Promise.all([
    listarDeudores({ cobradorId: sesion.personaId }),
    cajaAbiertaDe(sesion.personaId),
    prediosActivos(),
  ]);

  const total = deudores.reduce((s, d) => s + d.deuda, 0);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi cartera"
        descripcion="Los socios que Tesorería te asignó para cobrar a domicilio."
        accion={
          <Button variant="outline" asChild>
            <Link href="/cobranza/rendicion">
              {caja ? 'Ver mi rendición' : 'Abrir caja'}
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{deudores.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Socios en tu cartera
          </div>
        </div>
        <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{pesos(total)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Total por cobrar
          </div>
        </div>
      </div>

      {!caja && deudores.length > 0 && (
        <p className="mb-4 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
          No tenés una caja abierta. Podés cobrar igual eligiendo el predio en cada cobro, pero
          abrir una caja al empezar el día te deja todo junto para rendir.
        </p>
      )}

      <Tabla>
        <Encabezados>
          <Th className="text-right">N°</Th>
          <Th>Socio</Th>
          <Th>Estado</Th>
          <Th className="text-right">Cuotas</Th>
          <Th className="text-right">Debe</Th>
          <Th />
        </Encabezados>
        <Filas>
          {deudores.length === 0 && (
            <Vacio columnas={6}>
              No tenés socios asignados con deuda. Tesorería arma la cartera desde la pantalla de
              morosos.
            </Vacio>
          )}
          {deudores.map((d) => (
            <tr key={d.socioId}>
              <Td className="text-right font-mono tabular-nums text-muted-foreground">
                {d.numeroSocio}
              </Td>
              <Td className="font-medium">{d.nombre}</Td>
              <Td>
                <Pastilla tono={d.estado === 'EMPLAZADO' ? 'inactivo' : 'neutro'}>
                  {ESTADOS[d.estado as NombreEstado] ?? d.estado}
                </Pastilla>
              </Td>
              <Td className="text-right tabular-nums">{d.cuotas.length}</Td>
              <Td className="text-right font-medium tabular-nums">{pesos(d.deuda)}</Td>
              <Td className="text-right">
                <CobrarCuotas
                  socioId={d.socioId}
                  socioNombre={d.nombre}
                  cuotas={d.cuotas}
                  predios={predios}
                  tieneCajaAbierta={Boolean(caja)}
                />
              </Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
