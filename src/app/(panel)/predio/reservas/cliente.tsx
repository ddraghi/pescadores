'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { reservaPrioritaria } from '@/lib/acciones/reservas';

/**
 * Reserva prioritaria: el jefe de predio toma un recurso por encima de la
 * disponibilidad pública, para un evento del club o un mantenimiento.
 *
 * Queda marcada como del predio para que después se distinga de las de los socios.
 */
export function ReservaPrioritaria({
  espacios,
  alojamientos,
}: {
  espacios: { id: string; nombre: string }[];
  alojamientos: { id: string; nombre: string }[];
}) {
  const [que, setQue] = useState<'espacio' | 'alojamiento'>('espacio');

  const hoy = new Date().toISOString().slice(0, 10);
  const hayAlgo = espacios.length > 0 || alojamientos.length > 0;

  return (
    <DialogoFormulario
      titulo="Reservar para el predio"
      descripcion="Bloquea el recurso para un evento o un mantenimiento. Los socios no van a poder tomarlo en ese horario."
      accion={reservaPrioritaria}
      textoGuardar="Reservar"
      disparador={
        <Button disabled={!hayAlgo}>
          <CalendarPlus />
          Reserva del predio
        </Button>
      }
    >
      <Campo etiqueta="Qué" htmlFor="que">
        <Selector id="que" value={que} onChange={(e) => setQue(e.target.value as typeof que)}>
          <option value="espacio">Cancha o quincho</option>
          <option value="alojamiento">Alojamiento</option>
        </Selector>
      </Campo>

      {que === 'espacio' ? (
        <Campo etiqueta="Espacio" htmlFor="espacioId">
          <Selector id="espacioId" name="espacioId" required>
            {espacios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
      ) : (
        <Campo etiqueta="Alojamiento" htmlFor="alojamientoId">
          <Selector id="alojamientoId" name="alojamientoId" required>
            {alojamientos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Día" htmlFor="fechaDesde">
          <Input id="fechaDesde" name="fechaDesde" type="date" defaultValue={hoy} required />
        </Campo>
        <Campo etiqueta="Desde las" htmlFor="hora">
          <Input id="hora" name="hora" type="time" defaultValue="09:00" required />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Cuántas horas" htmlFor="horas">
          <Input id="horas" name="horas" type="number" min={1} max={240} defaultValue={4} required />
        </Campo>
        <Campo etiqueta="Personas" htmlFor="personas">
          <Input id="personas" name="personas" type="number" min={1} defaultValue={1} />
        </Campo>
      </div>

      <Campo etiqueta="Motivo" htmlFor="observaciones">
        <Input id="observaciones" name="observaciones" placeholder="Torneo interno / mantenimiento" />
      </Campo>
    </DialogoFormulario>
  );
}
