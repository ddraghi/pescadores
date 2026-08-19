import { exigirCapacidad } from '@/lib/auth';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { listarDeudores, listarCobradores, cajaAbiertaDe, prediosActivos } from '@/lib/datos/deudores';
import { pesos } from '@/lib/utils';
import { MorososCliente } from './cliente';

/**
 * La nómina de morosos es una pantalla propia y no un filtro escondido en cuotas: el
 * art. 46 inc. e obliga al Tesorero a comunicarle a la comisión quiénes están en la
 * situación del art. 28.
 */
export default async function Pagina() {
  const sesion = await exigirCapacidad('ver_cobranzas');

  const [deudores, cobradores, caja, predios] = await Promise.all([
    listarDeudores(),
    listarCobradores(),
    cajaAbiertaDe(sesion.personaId),
    prediosActivos(),
  ]);

  const deudaTotal = deudores.reduce((suma, d) => suma + d.deuda, 0);
  const emplazados = deudores.filter((d) => d.estado === 'EMPLAZADO').length;

  return (
    <>
      <EncabezadoPantalla
        titulo="Morosos"
        descripcion="Socios con cuotas impagas. Los emplazados llevan tres cuotas consecutivas y tienen diez días para regularizar antes de que la comisión pueda declararlos cesantes (art. 28)."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{deudores.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Socios con deuda
          </div>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="text-lg font-bold tabular-nums text-marca">{emplazados}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Emplazados
          </div>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{pesos(deudaTotal)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Deuda total
          </div>
        </div>
      </div>

      <MorososCliente
        deudores={deudores}
        cobradores={cobradores}
        predios={predios}
        tieneCajaAbierta={Boolean(caja)}
      />
    </>
  );
}
