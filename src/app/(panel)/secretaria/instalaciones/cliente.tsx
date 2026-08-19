'use client';

import { useState } from 'react';
import { BedDouble, Pencil, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import {
  guardarAlojamiento,
  alternarAlojamiento,
  guardarEspacio,
  alternarEspacio,
} from '@/lib/acciones/estructura';

export interface PredioOpcion {
  id: string;
  nombre: string;
}

export interface AlojamientoEnLista {
  id: string;
  nombre: string;
  tipo: string;
  predioId: string;
  predioNombre: string;
  capacidadBase: number;
  capacidadMax: number;
  modoReserva: string;
  activo: boolean;
}

export interface EspacioEnLista {
  id: string;
  nombre: string;
  tipo: string;
  predioId: string;
  predioNombre: string;
  unidad: string;
  bloqueHoras: number | null;
  altaDemanda: boolean;
  ventanaCancelacionHoras: number;
  activo: boolean;
}

const TIPOS_ALOJAMIENTO = [
  ['BUNGALOW', 'Bungalow'],
  ['CABANA', 'Cabaña'],
  ['PARCELA', 'Parcela'],
  ['CARPA', 'Carpa'],
  ['CASILLA', 'Casilla rodante'],
  ['VIVIENDA', 'Vivienda'],
] as const;

const TIPOS_ESPACIO = [
  ['CANCHA', 'Cancha'],
  ['QUINCHO', 'Quincho'],
] as const;

function SelectorPredio({ predios, valor }: { predios: PredioOpcion[]; valor?: string }) {
  return (
    <Campo etiqueta="Predio" htmlFor="predioId">
      <Selector id="predioId" name="predioId" defaultValue={valor ?? ''} required>
        <option value="" disabled>
          Elegí un predio
        </option>
        {predios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Selector>
    </Campo>
  );
}

// ─── Alojamientos ────────────────────────────────────────────────────────────

function CamposAlojamiento({
  item,
  predios,
}: {
  item?: AlojamientoEnLista;
  predios: PredioOpcion[];
}) {
  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}

      <Campo etiqueta="Nombre" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={item?.nombre} placeholder="Bungalow 1" required autoFocus />
      </Campo>

      <SelectorPredio predios={predios} valor={item?.predioId} />

      <Campo etiqueta="Tipo" htmlFor="tipo">
        <Selector id="tipo" name="tipo" defaultValue={item?.tipo ?? 'BUNGALOW'} required>
          {TIPOS_ALOJAMIENTO.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Capacidad base" htmlFor="capacidadBase" ayuda="La que cubre la tarifa.">
          <Input
            id="capacidadBase"
            name="capacidadBase"
            type="number"
            min={1}
            defaultValue={item?.capacidadBase ?? 4}
            required
          />
        </Campo>
        <Campo etiqueta="Capacidad máxima" htmlFor="capacidadMax" ayuda="Con personas adicionales.">
          <Input
            id="capacidadMax"
            name="capacidadMax"
            type="number"
            min={1}
            defaultValue={item?.capacidadMax ?? 6}
            required
          />
        </Campo>
      </div>

      <Campo etiqueta="Cómo se reserva" htmlFor="modoReserva">
        <Selector id="modoReserva" name="modoReserva" defaultValue={item?.modoReserva ?? 'ANTICIPADA'}>
          <option value="ANTICIPADA">Sólo con reserva previa</option>
          <option value="EN_EL_MOMENTO">Sólo en el momento</option>
          <option value="AMBAS">Las dos</option>
        </Selector>
      </Campo>
    </>
  );
}

function TablaAlojamientos({
  items,
  predios,
}: {
  items: AlojamientoEnLista[];
  predios: PredioOpcion[];
}) {
  const nombreTipo = (t: string) => TIPOS_ALOJAMIENTO.find(([v]) => v === t)?.[1] ?? t;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Se reservan por <strong>noche</strong>: bungalows, cabañas, parcelas, carpas y casillas.
        </p>
        <DialogoFormulario
          titulo="Nuevo alojamiento"
          accion={guardarAlojamiento}
          textoGuardar="Crear"
          disparador={
            <Button size="sm" disabled={predios.length === 0}>
              <Plus />
              Nuevo
            </Button>
          }
        >
          <CamposAlojamiento predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Alojamiento</Th>
          <Th>Predio</Th>
          <Th>Tipo</Th>
          <Th className="text-right">Capacidad</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {items.length === 0 && <Vacio columnas={6}>Todavía no hay alojamientos cargados.</Vacio>}
          {items.map((a) => (
            <tr key={a.id} className={a.activo ? undefined : 'opacity-60'}>
              <Td className="font-medium">{a.nombre}</Td>
              <Td className="text-muted-foreground">{a.predioNombre}</Td>
              <Td>{nombreTipo(a.tipo)}</Td>
              <Td className="text-right tabular-nums">
                {a.capacidadBase}
                {a.capacidadMax > a.capacidadBase && (
                  <span className="text-muted-foreground"> – {a.capacidadMax}</span>
                )}
              </Td>
              <Td>
                <Pastilla tono={a.activo ? 'activo' : 'inactivo'}>
                  {a.activo ? 'Activo' : 'Baja'}
                </Pastilla>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <DialogoFormulario
                    titulo={`Editar ${a.nombre}`}
                    accion={guardarAlojamiento}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Editar ${a.nombre}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposAlojamiento item={a} predios={predios} />
                  </DialogoFormulario>
                  <BotonAccion accion={alternarAlojamiento} id={a.id}>
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

// ─── Espacios ────────────────────────────────────────────────────────────────

function CamposEspacio({ item, predios }: { item?: EspacioEnLista; predios: PredioOpcion[] }) {
  const [unidad, setUnidad] = useState(item?.unidad ?? 'HORA');

  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}

      <Campo etiqueta="Nombre" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={item?.nombre} placeholder="Cancha de tenis 1" required autoFocus />
      </Campo>

      <SelectorPredio predios={predios} valor={item?.predioId} />

      <Campo etiqueta="Tipo" htmlFor="tipo">
        <Selector id="tipo" name="tipo" defaultValue={item?.tipo ?? 'CANCHA'} required>
          {TIPOS_ESPACIO.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo etiqueta="Cómo se reserva" htmlFor="unidad">
        <Selector
          id="unidad"
          name="unidad"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
        >
          <option value="HORA">Por hora — canchas</option>
          <option value="BLOQUE">Por bloque — quinchos</option>
        </Selector>
      </Campo>

      {unidad === 'BLOQUE' && (
        <Campo
          etiqueta="Horas del bloque"
          htmlFor="bloqueHoras"
          ayuda="En el tarifario del club los quinchos van por bloques de 5 horas, más hora adicional."
        >
          <Input
            id="bloqueHoras"
            name="bloqueHoras"
            type="number"
            min={1}
            defaultValue={item?.bloqueHoras ?? 5}
            required
          />
        </Campo>
      )}

      <Campo etiqueta="Horas para cancelar sin cargo" htmlFor="ventanaCancelacionHoras">
        <Input
          id="ventanaCancelacionHoras"
          name="ventanaCancelacionHoras"
          type="number"
          min={0}
          defaultValue={item?.ventanaCancelacionHoras ?? 12}
        />
      </Campo>

      <Casilla
        name="altaDemanda"
        etiqueta="Es de alta demanda"
        ayuda="Activa cupo, ventana de anticipación y límite por socio cuando se construyan las reservas."
        defaultChecked={item?.altaDemanda}
      />
    </>
  );
}

function TablaEspacios({ items, predios }: { items: EspacioEnLista[]; predios: PredioOpcion[] }) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Se reservan por <strong>hora</strong>: canchas y quinchos.
        </p>
        <DialogoFormulario
          titulo="Nuevo espacio"
          accion={guardarEspacio}
          textoGuardar="Crear"
          disparador={
            <Button size="sm" disabled={predios.length === 0}>
              <Plus />
              Nuevo
            </Button>
          }
        >
          <CamposEspacio predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Espacio</Th>
          <Th>Predio</Th>
          <Th>Tipo</Th>
          <Th>Reserva</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {items.length === 0 && <Vacio columnas={6}>Todavía no hay canchas ni quinchos cargados.</Vacio>}
          {items.map((e) => (
            <tr key={e.id} className={e.activo ? undefined : 'opacity-60'}>
              <Td>
                <div className="font-medium">{e.nombre}</div>
                {e.altaDemanda && (
                  <div className="text-[11px] text-marca">Alta demanda</div>
                )}
              </Td>
              <Td className="text-muted-foreground">{e.predioNombre}</Td>
              <Td>{e.tipo === 'CANCHA' ? 'Cancha' : 'Quincho'}</Td>
              <Td className="text-xs text-muted-foreground">
                {e.unidad === 'BLOQUE' ? `Bloque de ${e.bloqueHoras} h` : 'Por hora'}
              </Td>
              <Td>
                <Pastilla tono={e.activo ? 'activo' : 'inactivo'}>
                  {e.activo ? 'Activo' : 'Baja'}
                </Pastilla>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <DialogoFormulario
                    titulo={`Editar ${e.nombre}`}
                    accion={guardarEspacio}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Editar ${e.nombre}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposEspacio item={e} predios={predios} />
                  </DialogoFormulario>
                  <BotonAccion accion={alternarEspacio} id={e.id}>
                    {e.activo ? 'Dar de baja' : 'Reactivar'}
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

// ─── Pantalla ────────────────────────────────────────────────────────────────

export function InstalacionesCliente({
  alojamientos,
  espacios,
  predios,
}: {
  alojamientos: AlojamientoEnLista[];
  espacios: EspacioEnLista[];
  predios: PredioOpcion[];
}) {
  const [solapa, setSolapa] = useState<'alojamientos' | 'espacios'>('alojamientos');

  const solapas = [
    { id: 'alojamientos' as const, etiqueta: 'Alojamientos', icono: BedDouble, cantidad: alojamientos.length },
    { id: 'espacios' as const, etiqueta: 'Canchas y quinchos', icono: Trophy, cantidad: espacios.length },
  ];

  return (
    <>
      <div className="mb-5 flex gap-1 border-b border-border">
        {solapas.map((s) => {
          const Icono = s.icono;
          const activa = solapa === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSolapa(s.id)}
              className={
                activa
                  ? 'flex items-center gap-2 border-b-2 border-accent px-4 py-2 text-sm font-semibold'
                  : 'flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
              }
            >
              <Icono className="size-4" />
              {s.etiqueta}
              <span className="tabular-nums text-xs text-muted-foreground">{s.cantidad}</span>
            </button>
          );
        })}
      </div>

      {solapa === 'alojamientos' ? (
        <TablaAlojamientos items={alojamientos} predios={predios} />
      ) : (
        <TablaEspacios items={espacios} predios={predios} />
      )}
    </>
  );
}
