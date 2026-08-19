'use client';

import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from '@/components/panel/tabla';
import { guardarEgreso, eliminarEgreso } from '@/lib/acciones/tesoreria';
import { pesos } from '@/lib/utils';

export interface EgresoEnLista {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  predioId: string | null;
  predioNombre: string | null;
  comprobante: string | null;
}

function CamposEgreso({
  egreso,
  predios,
}: {
  egreso?: EgresoEnLista;
  predios: { id: string; nombre: string }[];
}) {
  return (
    <>
      {egreso && <input type="hidden" name="id" value={egreso.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fecha" htmlFor="fecha">
          <Input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={egreso?.fecha ?? new Date().toISOString().slice(0, 10)}
            required
          />
        </Campo>
        <Campo etiqueta="Monto" htmlFor="monto">
          <Input
            id="monto"
            name="monto"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={egreso?.monto ?? ''}
            required
          />
        </Campo>
      </div>

      <Campo etiqueta="Concepto" htmlFor="concepto">
        <Input
          id="concepto"
          name="concepto"
          defaultValue={egreso?.concepto}
          placeholder="Compra de cloro para la pileta"
          required
          autoFocus
        />
      </Campo>

      <Campo etiqueta="Predio" htmlFor="predioId" ayuda="Dejalo vacío si es un gasto del club en general.">
        <Selector id="predioId" name="predioId" defaultValue={egreso?.predioId ?? ''}>
          <option value="">Sin predio</option>
          {predios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo etiqueta="Comprobante" htmlFor="comprobante">
        <Input
          id="comprobante"
          name="comprobante"
          defaultValue={egreso?.comprobante ?? ''}
          placeholder="Factura B 0001-00012345"
        />
      </Campo>
    </>
  );
}

export function EgresosCliente({
  egresos,
  predios,
}: {
  egresos: EgresoEnLista[];
  predios: { id: string; nombre: string }[];
}) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DialogoFormulario
          titulo="Nuevo egreso"
          accion={guardarEgreso}
          textoGuardar="Registrar"
          disparador={
            <Button>
              <Plus />
              Nuevo egreso
            </Button>
          }
        >
          <CamposEgreso predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Fecha</Th>
          <Th>Concepto</Th>
          <Th>Predio</Th>
          <Th>Comprobante</Th>
          <Th className="text-right">Monto</Th>
          <Th />
        </Encabezados>
        <Filas>
          {egresos.length === 0 && (
            <Vacio columnas={6}>Todavía no se registró ningún egreso.</Vacio>
          )}
          {egresos.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">{e.fecha}</Td>
              <Td className="font-medium">{e.concepto}</Td>
              <Td className="text-sm text-muted-foreground">{e.predioNombre ?? '—'}</Td>
              <Td className="font-mono text-xs text-muted-foreground">{e.comprobante ?? '—'}</Td>
              <Td className="text-right font-medium tabular-nums">{pesos(e.monto)}</Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <DialogoFormulario
                    titulo="Editar egreso"
                    accion={guardarEgreso}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label="Editar egreso">
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposEgreso egreso={e} predios={predios} />
                  </DialogoFormulario>
                  <BotonAccion
                    accion={eliminarEgreso}
                    id={e.id}
                    confirmar={`¿Borrar el egreso "${e.concepto}"?`}
                  >
                    Borrar
                  </BotonAccion>
                </div>
              </Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
