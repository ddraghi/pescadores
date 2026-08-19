'use client';

import { CalendarPlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { generarCuotas, recalcularMorosidad, condonarCuota } from '@/lib/acciones/tesoreria';
import { ESTADOS_CUOTA, nombrePeriodo, periodoDe } from '@/lib/tarifario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { pesos } from '@/lib/utils';

export interface CuotaEnLista {
  id: string;
  periodo: string;
  concepto: string;
  monto: number;
  estado: string;
  vencimiento: string;
  socioNombre: string;
  numeroSocio: number;
}

export function AccionesCuotas() {
  const hoy = new Date();
  const proximo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const vencimientoSugerido = new Date(proximo.getFullYear(), proximo.getMonth(), 10);

  return (
    <div className="flex flex-wrap gap-2">
      <BotonAccion accion={async () => recalcularMorosidad()} id="">
        <span className="flex items-center gap-2">
          <RefreshCw className="size-4" />
          Recalcular morosidad
        </span>
      </BotonAccion>

      <DialogoFormulario
        titulo="Generar las cuotas de un período"
        descripcion="Se genera una cuota por socio según el precio de su categoría en el tarifario. Quien no tenga precio cargado no recibe cuota, y los socios en licencia quedan eximidos (art. 25)."
        accion={generarCuotas}
        textoGuardar="Generar"
        disparador={
          <Button>
            <CalendarPlus />
            Generar cuotas
          </Button>
        }
      >
        <Campo etiqueta="Período" htmlFor="periodo" ayuda="El mes que se está cobrando.">
          <Input
            id="periodo"
            name="periodo"
            placeholder="2026-08"
            pattern="\d{4}-\d{2}"
            defaultValue={periodoDe(proximo)}
            required
          />
        </Campo>
        <Campo
          etiqueta="Vence el"
          htmlFor="vencimiento"
          ayuda="Pasada esta fecha la cuota cuenta como impaga para el emplazamiento del art. 28."
        >
          <Input
            id="vencimiento"
            name="vencimiento"
            type="date"
            defaultValue={vencimientoSugerido.toISOString().slice(0, 10)}
            required
          />
        </Campo>
      </DialogoFormulario>
    </div>
  );
}

export function TablaCuotas({ cuotas }: { cuotas: CuotaEnLista[] }) {
  return (
    <Tabla>
      <Encabezados>
        <Th className="text-right">N°</Th>
        <Th>Socio</Th>
        <Th>Período</Th>
        <Th>Concepto</Th>
        <Th className="text-right">Monto</Th>
        <Th>Vence</Th>
        <Th>Estado</Th>
        <Th />
      </Encabezados>
      <Filas>
        {cuotas.length === 0 && (
          <Vacio columnas={8}>
            No hay cuotas para mostrar. Generá las de un período con el botón de arriba.
          </Vacio>
        )}
        {cuotas.map((c) => (
          <tr key={c.id}>
            <Td className="text-right font-mono tabular-nums text-muted-foreground">
              {c.numeroSocio}
            </Td>
            <Td className="font-medium">{c.socioNombre}</Td>
            <Td>{nombrePeriodo(c.periodo)}</Td>
            <Td className="text-sm text-muted-foreground">{c.concepto}</Td>
            <Td className="text-right tabular-nums">{pesos(c.monto)}</Td>
            <Td className="text-sm text-muted-foreground">{c.vencimiento}</Td>
            <Td>
              <Pastilla
                tono={
                  c.estado === 'PAGADA' ? 'activo' : c.estado === 'VENCIDA' ? 'inactivo' : 'neutro'
                }
              >
                {ESTADOS_CUOTA[c.estado as keyof typeof ESTADOS_CUOTA] ?? c.estado}
              </Pastilla>
            </Td>
            <Td className="text-right">
              {c.estado !== 'PAGADA' && c.estado !== 'CONDONADA' && (
                <BotonAccion
                  accion={condonarCuota}
                  id={c.id}
                  confirmar={`¿Condonar la cuota de ${nombrePeriodo(c.periodo)} de ${c.socioNombre}? Deja de contar como deuda.`}
                >
                  Condonar
                </BotonAccion>
              )}
            </Td>
          </tr>
        ))}
      </Filas>
    </Tabla>
  );
}
