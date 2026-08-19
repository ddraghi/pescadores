'use client';

import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { reservar } from '@/lib/acciones/reservas';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function manana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Turnos que se ofrecen. El club abre temprano y cierra tarde en temporada. */
const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

export function ReservarAlojamiento({
  id,
  nombre,
  capacidadMax,
}: {
  id: string;
  nombre: string;
  capacidadMax: number;
}) {
  return (
    <DialogoFormulario
      titulo={`Reservar ${nombre}`}
      descripcion="La entrada es a las 14 y la salida a las 10 del día que elijas como último."
      accion={reservar}
      textoGuardar="Reservar"
      disparador={
        <Button size="sm">
          <CalendarPlus />
          Reservar
        </Button>
      }
    >
      <input type="hidden" name="alojamientoId" value={id} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Desde" htmlFor={`d-${id}`}>
          <Input id={`d-${id}`} name="fechaDesde" type="date" defaultValue={hoy()} min={hoy()} required />
        </Campo>
        <Campo etiqueta="Hasta" htmlFor={`h-${id}`}>
          <Input id={`h-${id}`} name="fechaHasta" type="date" defaultValue={manana()} min={hoy()} required />
        </Campo>
      </div>
      <Campo etiqueta="Personas" htmlFor={`p-${id}`} ayuda={`Hasta ${capacidadMax}.`}>
        <Input id={`p-${id}`} name="personas" type="number" min={1} max={capacidadMax} defaultValue={2} required />
      </Campo>
      <Campo etiqueta="Algo que quieras avisar" htmlFor={`o-${id}`}>
        <Input id={`o-${id}`} name="observaciones" placeholder="Llegamos de noche" />
      </Campo>
    </DialogoFormulario>
  );
}

export function ReservarEspacio({
  id,
  nombre,
  unidad,
  bloqueHoras,
}: {
  id: string;
  nombre: string;
  unidad: string;
  bloqueHoras: number | null;
}) {
  const porBloque = unidad === 'BLOQUE';

  return (
    <DialogoFormulario
      titulo={`Reservar ${nombre}`}
      descripcion={
        porBloque
          ? `Se reserva por bloques de ${bloqueHoras ?? 5} horas.`
          : 'Se reserva por hora.'
      }
      accion={reservar}
      textoGuardar="Reservar"
      disparador={
        <Button size="sm">
          <CalendarPlus />
          Reservar
        </Button>
      }
    >
      <input type="hidden" name="espacioId" value={id} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Día" htmlFor={`f-${id}`}>
          <Input id={`f-${id}`} name="fechaDesde" type="date" defaultValue={hoy()} min={hoy()} required />
        </Campo>
        <Campo etiqueta="Desde las" htmlFor={`hr-${id}`}>
          <Selector id={`hr-${id}`} name="hora" defaultValue="18:00" required>
            {HORAS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Selector>
        </Campo>
      </div>
      <Campo etiqueta="Cuántos son" htmlFor={`pe-${id}`}>
        <Input id={`pe-${id}`} name="personas" type="number" min={1} defaultValue={4} required />
      </Campo>
    </DialogoFormulario>
  );
}
