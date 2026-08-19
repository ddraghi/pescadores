'use client';

import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { guardarActividad, alternarActividad } from '@/lib/acciones/estructura';

export interface PredioOpcion {
  id: string;
  nombre: string;
}

export interface ActividadEnLista {
  id: string;
  nombre: string;
  modalidad: string;
  activo: boolean;
  prediosIds: string[];
  prediosNombres: string[];
}

function CamposActividad({
  actividad,
  predios,
}: {
  actividad?: ActividadEnLista;
  predios: PredioOpcion[];
}) {
  return (
    <>
      {actividad && <input type="hidden" name="id" value={actividad.id} />}

      <Campo etiqueta="Nombre" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={actividad?.nombre} placeholder="Natación" required autoFocus />
      </Campo>

      <Campo
        etiqueta="Cómo se cobra"
        htmlFor="modalidad"
        ayuda="Igual que en el tarifario del club: por mes o por turno."
      >
        <Selector id="modalidad" name="modalidad" defaultValue={actividad?.modalidad ?? 'mensual'}>
          <option value="mensual">Por mes</option>
          <option value="turno">Por turno</option>
        </Selector>
      </Campo>

      <div className="space-y-2">
        <p className="text-sm font-medium">Dónde se dicta</p>
        <p className="text-xs text-muted-foreground">
          Una actividad puede darse en más de un predio: la colonia de verano se dicta en los dos de la ciudad.
        </p>
        <div className="space-y-2 rounded-md border border-border p-3">
          {predios.map((p) => (
            <Casilla
              key={p.id}
              name="predios"
              value={p.id}
              etiqueta={p.nombre}
              defaultChecked={actividad?.prediosIds.includes(p.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function ActividadesCliente({
  actividades,
  predios,
}: {
  actividades: ActividadEnLista[];
  predios: PredioOpcion[];
}) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DialogoFormulario
          titulo="Nueva actividad"
          accion={guardarActividad}
          textoGuardar="Crear actividad"
          disparador={
            <Button disabled={predios.length === 0}>
              <Plus />
              Nueva actividad
            </Button>
          }
        >
          <CamposActividad predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Actividad</Th>
          <Th>Se cobra</Th>
          <Th>Predios</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {actividades.length === 0 && (
            <Vacio columnas={5}>
              {predios.length === 0 ? 'Primero cargá un predio.' : 'Todavía no hay actividades cargadas.'}
            </Vacio>
          )}

          {actividades.map((a) => (
            <tr key={a.id} className={a.activo ? undefined : 'opacity-60'}>
              <Td className="font-medium">{a.nombre}</Td>
              <Td className="text-muted-foreground">
                {a.modalidad === 'mensual' ? 'Por mes' : 'Por turno'}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {a.prediosNombres.map((n) => (
                    <Pastilla key={n}>{n}</Pastilla>
                  ))}
                </div>
              </Td>
              <Td>
                <Pastilla tono={a.activo ? 'activo' : 'inactivo'}>
                  {a.activo ? 'Activa' : 'Baja'}
                </Pastilla>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <DialogoFormulario
                    titulo={`Editar ${a.nombre}`}
                    accion={guardarActividad}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Editar ${a.nombre}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposActividad actividad={a} predios={predios} />
                  </DialogoFormulario>
                  <BotonAccion accion={alternarActividad} id={a.id}>
                    {a.activo ? 'Dar de baja' : 'Reactivar'}
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
