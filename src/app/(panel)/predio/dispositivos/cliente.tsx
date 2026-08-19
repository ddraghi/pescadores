'use client';

import { useState } from 'react';
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { Testigo, type DispositivoTestigo } from '@/components/panel/testigo';
import {
  guardarDispositivo,
  alternarDispositivoActivo,
  guardarHorario,
  borrarHorario,
} from '@/lib/acciones/dispositivos';
import {
  PROPOSITOS, VIAS, VIAS_LOCALES, CONFIRMA_POR_DEFECTO, DIAS_SEMANA, nombrarDias,
  type NombreProposito, type NombreVia,
} from '@/lib/dispositivos';

export interface HorarioEnLista {
  id: string;
  hora: string;
  encender: boolean;
  dias: number[];
}

export interface DispositivoEnLista extends DispositivoTestigo {
  predioId: string;
  predioNombre: string;
  predioSatelital: boolean;
  deviceId: string;
  via: string;
  direccion: string | null;
  horarios: HorarioEnLista[];
  enCroquis: string | null;
}

function CamposDispositivo({
  dispositivo,
  predios,
}: {
  dispositivo?: DispositivoEnLista;
  predios: { id: string; nombre: string; conexionSatelital: boolean }[];
}) {
  const [predioId, setPredioId] = useState(dispositivo?.predioId ?? predios[0]?.id ?? '');
  const [proposito, setProposito] = useState<NombreProposito>(
    (dispositivo?.proposito as NombreProposito) ?? 'ILUMINACION',
  );

  const predio = predios.find((p) => p.id === predioId);
  const soloLocal = predio?.conexionSatelital ?? false;
  const vias = soloLocal
    ? VIAS_LOCALES.map((v) => [v, VIAS[v]] as const)
    : (Object.entries(VIAS) as [NombreVia, string][]);

  return (
    <>
      {dispositivo && <input type="hidden" name="id" value={dispositivo.id} />}

      <Campo etiqueta="Nombre" htmlFor="nombre" ayuda="Es lo que se va a leer en el croquis.">
        <Input id="nombre" name="nombre" defaultValue={dispositivo?.nombre} placeholder="Luces del quincho" required autoFocus />
      </Campo>

      <Campo etiqueta="Predio" htmlFor="predioId">
        <Selector id="predioId" name="predioId" value={predioId} onChange={(e) => setPredioId(e.target.value)} required>
          {predios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.conexionSatelital ? ' (satelital)' : ''}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo
        etiqueta="Para qué es"
        htmlFor="proposito"
        ayuda="Filtra las vistas y define si conviene pedir confirmación antes de accionarlo."
      >
        <Selector
          id="proposito"
          name="proposito"
          value={proposito}
          onChange={(e) => setProposito(e.target.value as NombreProposito)}
        >
          {Object.entries(PROPOSITOS).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo
        etiqueta="Identificador en eWeLink"
        htmlFor="deviceId"
        ayuda="El que muestra la aplicación de eWeLink. Se vincula ahí una sola vez; de ahí en adelante se opera desde acá."
      >
        <Input id="deviceId" name="deviceId" defaultValue={dispositivo?.deviceId} placeholder="10012a4bcd" required />
      </Campo>

      <Campo
        etiqueta="Cómo se le habla"
        htmlFor="via"
        ayuda={
          soloLocal
            ? 'Este predio va por satélite: sólo se ofrecen las vías locales. Por la nube, la orden sube y baja por satélite dos veces.'
            : undefined
        }
      >
        <Selector id="via" name="via" defaultValue={dispositivo?.via ?? 'sonoff_lan'}>
          {vias.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo etiqueta="Dirección en la red local" htmlFor="direccion" ayuda="La IP del aparato, o el puerto serie del relay.">
        <Input id="direccion" name="direccion" defaultValue={dispositivo?.direccion ?? ''} placeholder="192.168.1.50" />
      </Campo>

      <Campo etiqueta="Dónde está" htmlFor="ubicacion">
        <Input id="ubicacion" name="ubicacion" defaultValue={dispositivo?.ubicacion ?? ''} placeholder="Tablero del quincho" />
      </Campo>

      <Casilla
        name="requiereConfirmacion"
        etiqueta="Pedir confirmación antes de accionarlo"
        ayuda="Recomendado en bombas y riego: un clic por error tiene consecuencias."
        defaultChecked={dispositivo?.requiereConfirmacion ?? CONFIRMA_POR_DEFECTO.includes(proposito)}
      />
    </>
  );
}

function Horarios({ dispositivo }: { dispositivo: DispositivoEnLista }) {
  return (
    <DialogoFormulario
      titulo={`Horarios de ${dispositivo.nombre}`}
      descripcion="Los ejecuta la PC de la portería, que está encendida las 24 horas. Si se cae el enlace, se cumplen igual: la orden nunca sale del predio."
      accion={guardarHorario}
      textoGuardar="Agregar horario"
      disparador={
        <Button variant="ghost" size="sm" aria-label={`Horarios de ${dispositivo.nombre}`}>
          <Clock />
          {dispositivo.horarios.length > 0 && (
            <span className="text-xs tabular-nums">{dispositivo.horarios.length}</span>
          )}
        </Button>
      }
    >
      <input type="hidden" name="dispositivoId" value={dispositivo.id} />

      {dispositivo.horarios.length > 0 && (
        <div className="divide-y divide-border rounded-md border border-border">
          {dispositivo.horarios.map((h) => (
            <div key={h.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="font-mono tabular-nums">{h.hora}</span>
              <span className={h.encender ? 'text-paso-ok' : 'text-muted-foreground'}>
                {h.encender ? 'enciende' : 'apaga'}
              </span>
              <span className="flex-1 text-xs text-muted-foreground">{nombrarDias(h.dias)}</span>
              <BotonAccion accion={borrarHorario} id={h.id} confirmar="¿Borrar este horario?">
                <Trash2 className="size-3.5" />
              </BotonAccion>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Hora" htmlFor={`hora-${dispositivo.id}`}>
          <Input id={`hora-${dispositivo.id}`} name="hora" type="time" defaultValue="06:00" required />
        </Campo>
        <Campo etiqueta="Acción" htmlFor={`enc-${dispositivo.id}`}>
          <Selector id={`enc-${dispositivo.id}`} name="encender" defaultValue="si">
            <option value="si">Encender</option>
            <option value="no">Apagar</option>
          </Selector>
        </Campo>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Días</p>
        <p className="text-xs text-muted-foreground">Sin marcar ninguno, se aplica todos los días.</p>
        <div className="flex flex-wrap gap-3">
          {DIAS_SEMANA.map((d) => (
            <label key={d.valor} className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input type="checkbox" name="dias" value={d.valor} className="size-4 accent-[hsl(var(--accent))]" />
              {d.corto}
            </label>
          ))}
        </div>
      </div>
    </DialogoFormulario>
  );
}

export function DispositivosCliente({
  dispositivos,
  predios,
  puedeAdministrar,
  puedeOperar,
}: {
  dispositivos: DispositivoEnLista[];
  predios: { id: string; nombre: string; conexionSatelital: boolean }[];
  puedeAdministrar: boolean;
  puedeOperar: boolean;
}) {
  const [filtro, setFiltro] = useState<string>('');

  const visibles = filtro ? dispositivos.filter((d) => d.proposito === filtro) : dispositivos;
  const cuantos = (p: string) => dispositivos.filter((d) => d.proposito === p).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* El filtro que pediste: que las vistas no se mezclen. */}
        <div className="flex flex-wrap gap-1">
          <Button variant={filtro === '' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('')}>
            Todos <span className="ml-1 tabular-nums opacity-70">{dispositivos.length}</span>
          </Button>
          {Object.entries(PROPOSITOS)
            .filter(([v]) => cuantos(v) > 0)
            .map(([v, t]) => (
              <Button
                key={v}
                variant={filtro === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro(v)}
              >
                {t} <span className="ml-1 tabular-nums opacity-70">{cuantos(v)}</span>
              </Button>
            ))}
        </div>

        {puedeAdministrar && (
          <DialogoFormulario
            titulo="Nuevo dispositivo"
            descripcion="Un interruptor Sonoff de un canal: una luz, una bomba, el riego, una barrera."
            accion={guardarDispositivo}
            textoGuardar="Cargar"
            disparador={
              <Button disabled={predios.length === 0}>
                <Plus />
                Nuevo dispositivo
              </Button>
            }
          >
            <CamposDispositivo predios={predios} />
          </DialogoFormulario>
        )}
      </div>

      <Tabla>
        <Encabezados>
          <Th>Estado</Th>
          <Th>Dispositivo</Th>
          <Th>Dónde</Th>
          <Th>Vía</Th>
          <Th>Horarios</Th>
          <Th />
        </Encabezados>
        <Filas>
          {visibles.length === 0 && (
            <Vacio columnas={6}>
              {dispositivos.length === 0
                ? 'Todavía no hay dispositivos cargados. Vinculá el Sonoff desde su aplicación y después cargalo acá con su identificador.'
                : 'Ninguno de ese tipo.'}
            </Vacio>
          )}

          {visibles.map((d) => (
            <tr key={d.id} className={d.activo ? undefined : 'opacity-60'}>
              <Td>
                <Testigo dispositivo={d} puedeOperar={puedeOperar} />
              </Td>
              <Td>
                <div className="font-medium">{d.nombre}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{d.deviceId}</div>
              </Td>
              <Td className="text-sm text-muted-foreground">
                {d.predioNombre}
                {d.ubicacion && <div className="text-xs">{d.ubicacion}</div>}
                {d.enCroquis && <div className="text-xs text-marca">en {d.enCroquis}</div>}
              </Td>
              <Td className="text-xs text-muted-foreground">
                {VIAS[d.via as NombreVia] ?? d.via}
                {d.direccion && <div className="font-mono">{d.direccion}</div>}
              </Td>
              <Td>
                {d.horarios.length === 0 ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <div className="space-y-0.5">
                    {d.horarios.slice(0, 2).map((h) => (
                      <div key={h.id} className="whitespace-nowrap text-xs">
                        <span className="font-mono">{h.hora}</span>{' '}
                        {h.encender ? 'enciende' : 'apaga'}
                      </div>
                    ))}
                    {d.horarios.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        y {d.horarios.length - 2} más
                      </div>
                    )}
                  </div>
                )}
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  {puedeAdministrar && (
                    <>
                      <Horarios dispositivo={d} />
                      <DialogoFormulario
                        titulo={`Editar ${d.nombre}`}
                        accion={guardarDispositivo}
                        disparador={
                          <Button variant="ghost" size="sm" aria-label={`Editar ${d.nombre}`}>
                            <Pencil />
                          </Button>
                        }
                      >
                        <CamposDispositivo dispositivo={d} predios={predios} />
                      </DialogoFormulario>
                      <BotonAccion accion={alternarDispositivoActivo} id={d.id}>
                        {d.activo ? 'Dar de baja' : 'Reactivar'}
                      </BotonAccion>
                    </>
                  )}
                  {!puedeAdministrar && !d.activo && <Pastilla tono="inactivo">Baja</Pastilla>}
                </div>
              </Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
