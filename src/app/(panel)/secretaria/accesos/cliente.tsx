'use client';

import { useState } from 'react';
import { DoorOpen, Pencil, Plus, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { guardarAcceso, alternarAcceso } from '@/lib/acciones/estructura';
import { VIAS, type NombreVia } from '@/lib/dispositivos';

export interface PredioOpcion {
  id: string;
  nombre: string;
  conexionSatelital: boolean;
}

export interface DispositivoOpcion {
  id: string;
  nombre: string;
  predioId: string;
  via: string;
}

export interface AccesoEnLista {
  id: string;
  nombre: string;
  tipo: 'PORTERIA' | 'CONTROL';
  predioId: string;
  predioNombre: string;
  dispositivoId: string | null;
  dispositivoNombre: string | null;
  dispositivoVia: string | null;
  exigeAptoMedico: boolean;
  exigeDerecho: string | null;
  activo: boolean;
}

function CamposAcceso({
  acceso,
  predios,
  dispositivos,
}: {
  acceso?: AccesoEnLista;
  predios: PredioOpcion[];
  dispositivos: DispositivoOpcion[];
}) {
  const [predioId, setPredioId] = useState(acceso?.predioId ?? '');
  const [tipo, setTipo] = useState(acceso?.tipo ?? 'PORTERIA');

  // Sólo tiene sentido ofrecer los interruptores del predio elegido.
  const delPredio = dispositivos.filter((d) => d.predioId === predioId);

  return (
    <>
      {acceso && <input type="hidden" name="id" value={acceso.id} />}

      <Campo etiqueta="Nombre" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={acceso?.nombre} placeholder="Portería principal" required autoFocus />
      </Campo>

      <Campo etiqueta="Predio" htmlFor="predioId">
        <Selector
          id="predioId"
          name="predioId"
          value={predioId}
          onChange={(e) => setPredioId(e.target.value)}
          required
        >
          <option value="" disabled>
            Elegí un predio
          </option>
          {predios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.conexionSatelital ? ' (satelital)' : ''}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo
        etiqueta="Tipo de puesto"
        htmlFor="tipo"
        ayuda="La portería cobra y habilita. El punto de control sólo verifica que la persona esté apta y abre: no maneja dinero."
      >
        <Selector
          id="tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as 'PORTERIA' | 'CONTROL')}
          required
        >
          <option value="PORTERIA">Portería — cobra y habilita</option>
          <option value="CONTROL">Punto de control — sólo verifica</option>
        </Selector>
      </Campo>

      <Campo
        etiqueta="Interruptor que abre"
        htmlFor="dispositivoId"
        ayuda={
          delPredio.length === 0 && predioId
            ? 'Este predio todavía no tiene dispositivos cargados. Los carga el jefe de predio en su panel.'
            : 'Sale del registro de dispositivos del predio.'
        }
      >
        <Selector id="dispositivoId" name="dispositivoId" defaultValue={acceso?.dispositivoId ?? ''}>
          <option value="">Sin interruptor</option>
          {delPredio.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre} — {VIAS[d.via as NombreVia] ?? d.via}
            </option>
          ))}
        </Selector>
      </Campo>

      {tipo === 'CONTROL' && (
        <>
          <Casilla
            name="exigeAptoMedico"
            etiqueta="Exige apto médico vigente"
            ayuda="Es lo que se pide en la pileta. Sin apto, el control no deja pasar."
            defaultChecked={acceso?.exigeAptoMedico}
          />
          <Campo
            etiqueta="Exige una habilitación con vigencia"
            htmlFor="exigeDerecho"
            ayuda="El derecho de pileta de temporada, por ejemplo."
          >
            <Selector id="exigeDerecho" name="exigeDerecho" defaultValue={acceso?.exigeDerecho ?? ''}>
              <option value="">No exige ninguna</option>
              <option value="DERECHO_PILETA">Derecho de pileta</option>
            </Selector>
          </Campo>
        </>
      )}
    </>
  );
}

export function AccesosCliente({
  accesos,
  predios,
  dispositivos,
}: {
  accesos: AccesoEnLista[];
  predios: PredioOpcion[];
  dispositivos: DispositivoOpcion[];
}) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DialogoFormulario
          titulo="Nuevo acceso"
          descripcion="Un puesto físico donde se identifica a la gente: la entrada de un predio, o el control de una zona como la pileta o la bajada de lanchas."
          accion={guardarAcceso}
          textoGuardar="Crear acceso"
          disparador={
            <Button disabled={predios.length === 0}>
              <Plus />
              Nuevo acceso
            </Button>
          }
        >
          <CamposAcceso predios={predios} dispositivos={dispositivos} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Acceso</Th>
          <Th>Predio</Th>
          <Th>Tipo</Th>
          <Th>Interruptor</Th>
          <Th>Exige</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {accesos.length === 0 && (
            <Vacio columnas={7}>
              {predios.length === 0 ? 'Primero cargá un predio.' : 'Todavía no hay accesos cargados.'}
            </Vacio>
          )}

          {accesos.map((a) => (
            <tr key={a.id} className={a.activo ? undefined : 'opacity-60'}>
              <Td>
                <div className="flex items-center gap-2 font-medium">
                  {a.tipo === 'PORTERIA' ? (
                    <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ScanLine className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  {a.nombre}
                </div>
              </Td>
              <Td className="text-muted-foreground">{a.predioNombre}</Td>
              <Td>
                <Pastilla tono={a.tipo === 'PORTERIA' ? 'activo' : 'neutro'}>
                  {a.tipo === 'PORTERIA' ? 'Portería' : 'Control'}
                </Pastilla>
              </Td>
              <Td className="text-sm text-muted-foreground">
                {a.dispositivoNombre ? (
                  <>
                    {a.dispositivoNombre}
                    <div className="text-xs">
                      {VIAS[a.dispositivoVia as NombreVia] ?? a.dispositivoVia}
                    </div>
                  </>
                ) : (
                  '—'
                )}
              </Td>
              <Td className="text-xs text-muted-foreground">
                {a.exigeAptoMedico && <div>Apto médico</div>}
                {a.exigeDerecho === 'DERECHO_PILETA' && <div>Derecho de pileta</div>}
                {!a.exigeAptoMedico && !a.exigeDerecho && '—'}
              </Td>
              <Td>
                <Pastilla tono={a.activo ? 'activo' : 'inactivo'}>
                  {a.activo ? 'Activo' : 'Dado de baja'}
                </Pastilla>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <DialogoFormulario
                    titulo={`Editar ${a.nombre}`}
                    accion={guardarAcceso}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Editar ${a.nombre}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposAcceso acceso={a} predios={predios} dispositivos={dispositivos} />
                  </DialogoFormulario>

                  <BotonAccion accion={alternarAcceso} id={a.id}>
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
