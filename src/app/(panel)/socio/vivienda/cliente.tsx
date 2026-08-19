'use client';

import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { pedirAutorizacion } from '@/lib/acciones/barrio';
import { DIAS_MAXIMOS_ESTADIA } from '@/lib/barrio';

/**
 * Pedido de permiso para prestar la vivienda.
 *
 * Los nombres van uno por línea porque es exactamente lo que la portería va a buscar
 * cuando esa gente llegue a la tranquera.
 */
export function PedirPermiso({ loteId, numero }: { loteId: string; numero: string }) {
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <DialogoFormulario
      titulo={`Permiso de estadía · lote ${numero}`}
      descripcion={`Para que otras personas usen tu vivienda hace falta este permiso, con sus nombres y por un máximo de ${DIAS_MAXIMOS_ESTADIA} días. Lo aprueba Secretaría.`}
      accion={pedirAutorizacion}
      textoGuardar="Pedir permiso"
      disparador={
        <Button>
          <KeyRound />
          Pedir permiso de estadía
        </Button>
      }
    >
      <input type="hidden" name="loteId" value={loteId} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Desde" htmlFor="desde">
          <Input id="desde" name="desde" type="date" defaultValue={hoy} min={hoy} required />
        </Campo>
        <Campo etiqueta="Hasta" htmlFor="hasta">
          <Input id="hasta" name="hasta" type="date" defaultValue={hoy} min={hoy} required />
        </Campo>
      </div>
      <Campo
        etiqueta="Quiénes van a estar"
        htmlFor="personas"
        ayuda="Un nombre por línea. La portería sólo deja pasar a los que estén acá."
      >
        <textarea
          id="personas"
          name="personas"
          rows={4}
          required
          placeholder={'Juan Pérez\nMaría Gómez'}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Campo>
    </DialogoFormulario>
  );
}
