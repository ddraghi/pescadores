'use client';

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from '@/components/panel/tabla';
import { emitirApto } from '@/lib/acciones/medico';
import { DIAS_APTO_POR_DEFECTO } from '@/lib/socios';
import type { EnEspera } from '@/lib/datos/medico';

function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function Revisar({ socio }: { socio: EnEspera }) {
  const [autoriza, setAutoriza] = useState('si');

  return (
    <DialogoFormulario
      titulo={`Revisación de ${socio.nombre}`}
      descripcion="Lo que cargues acá es lo que va a ver el control de la pileta cuando pase."
      accion={emitirApto}
      textoGuardar="Registrar revisación"
      disparador={
        <Button size="sm">
          <Stethoscope />
          Revisar
        </Button>
      }
    >
      <input type="hidden" name="socioId" value={socio.socioId} />

      <Campo etiqueta="¿Queda autorizado para la pileta?" htmlFor={`aut-${socio.socioId}`}>
        <Selector
          id={`aut-${socio.socioId}`}
          name="autorizado"
          value={autoriza}
          onChange={(e) => setAutoriza(e.target.value)}
        >
          <option value="si">Sí, autorizado</option>
          <option value="no">No autorizado</option>
        </Selector>
      </Campo>

      {autoriza === 'si' && (
        <Campo
          etiqueta="El apto vence el"
          htmlFor={`h-${socio.socioId}`}
          ayuda={`Por defecto ${DIAS_APTO_POR_DEFECTO} días, que es cada cuánto la cobra el club.`}
        >
          <Input
            id={`h-${socio.socioId}`}
            name="hasta"
            type="date"
            defaultValue={enDias(DIAS_APTO_POR_DEFECTO)}
          />
        </Campo>
      )}

      <Campo
        etiqueta="Novedades"
        htmlFor={`n-${socio.socioId}`}
        ayuda={
          autoriza === 'no'
            ? 'Obligatorio: el socio tiene que saber qué corregir.'
            : 'Lo que haya que dejar asentado de la revisación.'
        }
      >
        <Input id={`n-${socio.socioId}`} name="novedades" required={autoriza === 'no'} />
      </Campo>
    </DialogoFormulario>
  );
}

export function ColaCliente({ cola }: { cola: EnEspera[] }) {
  return (
    <Tabla>
      <Encabezados>
        <Th className="text-right">N°</Th>
        <Th>Socio</Th>
        <Th>Pagó la revisación</Th>
        <Th>Apto anterior</Th>
        <Th />
      </Encabezados>
      <Filas>
        {cola.length === 0 && (
          <Vacio columnas={5}>
            No hay nadie esperando. La cola se arma sola cuando la portería cobra una
            revisación de enfermería.
          </Vacio>
        )}
        {cola.map((s) => (
          <tr key={s.socioId}>
            <Td className="text-right font-mono tabular-nums text-muted-foreground">
              {s.numeroSocio}
            </Td>
            <Td className="font-medium">{s.nombre}</Td>
            <Td className="text-sm text-muted-foreground">
              {s.pagadoEn}
              <div className="text-xs">{s.predio}</div>
            </Td>
            <Td className="text-sm text-muted-foreground">
              {s.aptoAnteriorHasta ? `venció el ${s.aptoAnteriorHasta}` : 'primera vez'}
            </Td>
            <Td className="text-right">
              <Revisar socio={s} />
            </Td>
          </tr>
        ))}
      </Filas>
    </Tabla>
  );
}
