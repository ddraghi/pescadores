'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { cobrarCuotas } from '@/lib/acciones/tesoreria';
import { MEDIOS_PAGO, nombrePeriodo } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

export interface CuotaCobrable {
  id: string;
  periodo: string;
  concepto: string;
  monto: number;
  vencida: boolean;
}

/**
 * Cobro de cuotas de un socio. Se pueden marcar varias de una: es lo normal cuando
 * alguien viene a ponerse al día después de meses.
 *
 * El predio se pide sólo si quien cobra no tiene una caja abierta; si la tiene, el cobro
 * se adjunta a esa caja y toma su predio.
 */
export function CobrarCuotas({
  socioId,
  socioNombre,
  cuotas,
  predios,
  tieneCajaAbierta,
  disparador,
}: {
  socioId: string;
  socioNombre: string;
  cuotas: CuotaCobrable[];
  predios: { id: string; nombre: string }[];
  tieneCajaAbierta: boolean;
  disparador?: React.ReactNode;
}) {
  // Arrancan todas marcadas: quien viene a pagar suele saldar todo lo que debe.
  const [elegidas, setElegidas] = useState<string[]>(cuotas.map((c) => c.id));

  const total = cuotas
    .filter((c) => elegidas.includes(c.id))
    .reduce((suma, c) => suma + c.monto, 0);

  function alternar(id: string) {
    setElegidas((previas) =>
      previas.includes(id) ? previas.filter((x) => x !== id) : [...previas, id],
    );
  }

  return (
    <DialogoFormulario
      titulo={`Cobrar a ${socioNombre}`}
      descripcion={`Debe ${cuotas.length} ${cuotas.length === 1 ? 'cuota' : 'cuotas'}. Marcá las que paga.`}
      accion={cobrarCuotas}
      textoGuardar={`Cobrar ${pesos(total)}`}
      disparador={
        disparador ?? (
          <Button variant="outline" size="sm">
            <Wallet />
            Cobrar
          </Button>
        )
      }
    >
      <input type="hidden" name="socioId" value={socioId} />

      <div className="divide-y divide-border rounded-md border border-border">
        {cuotas.map((c) => {
          const marcada = elegidas.includes(c.id);
          return (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                name="cuotas"
                value={c.id}
                checked={marcada}
                onChange={() => alternar(c.id)}
                className="size-4 accent-[hsl(var(--accent))]"
              />
              <span className="flex-1">
                {nombrePeriodo(c.periodo)}
                {c.vencida && <span className="ml-2 text-xs text-marca">vencida</span>}
              </span>
              <span className="tabular-nums">{pesos(c.monto)}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-bold tabular-nums">{pesos(total)}</span>
      </div>

      <Campo etiqueta="Medio de pago" htmlFor={`medio-${socioId}`}>
        <Selector id={`medio-${socioId}`} name="medioPago" defaultValue="EFECTIVO" required>
          {Object.entries(MEDIOS_PAGO).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      {!tieneCajaAbierta && (
        <Campo
          etiqueta="Predio"
          htmlFor={`predio-${socioId}`}
          ayuda="No tenés una caja abierta, así que hace falta indicar dónde se cobra."
        >
          <Selector id={`predio-${socioId}`} name="predioId" required>
            <option value="">Elegí el predio</option>
            {predios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
      )}
    </DialogoFormulario>
  );
}
