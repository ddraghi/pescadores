'use client';

import { DoorOpen, Pencil, Plus, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { guardarAcceso, alternarAcceso } from '@/lib/acciones/estructura';

export interface PredioOpcion {
  id: string;
  nombre: string;
  conexionSatelital: boolean;
}

export interface AccesoEnLista {
  id: string;
  nombre: string;
  tipo: 'PORTERIA' | 'CONTROL';
  predioId: string;
  predioNombre: string;
  predioSatelital: boolean;
  dispositivoTipo: string | null;
  dispositivoRef: string | null;
  activo: boolean;
}

const DISPOSITIVOS: { valor: string; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Sin interruptor' },
  { valor: 'relay_usb', etiqueta: 'Relay USB (en la PC del puesto)' },
  { valor: 'sonoff_lan', etiqueta: 'Sonoff por red local' },
  { valor: 'sonoff_cloud', etiqueta: 'Sonoff por la nube — sólo enlace terrestre' },
];

function CamposAcceso({ acceso, predios }: { acceso?: AccesoEnLista; predios: PredioOpcion[] }) {
  return (
    <>
      {acceso && <input type="hidden" name="id" value={acceso.id} />}

      <Campo etiqueta="Nombre" htmlFor="nombre">
        <Input
          id="nombre"
          name="nombre"
          defaultValue={acceso?.nombre}
          placeholder="Portería principal"
          required
          autoFocus
        />
      </Campo>

      <Campo etiqueta="Predio" htmlFor="predioId">
        <Selector id="predioId" name="predioId" defaultValue={acceso?.predioId ?? ''} required>
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
        <Selector id="tipo" name="tipo" defaultValue={acceso?.tipo ?? 'PORTERIA'} required>
          <option value="PORTERIA">Portería — cobra y habilita</option>
          <option value="CONTROL">Punto de control — sólo verifica</option>
        </Selector>
      </Campo>

      <Campo
        etiqueta="Interruptor"
        htmlFor="dispositivoTipo"
        ayuda="En los predios satelitales tiene que ser por red local: por la nube, la orden hace dos saltos de satélite y tarda segundos en abrir."
      >
        <Selector
          id="dispositivoTipo"
          name="dispositivoTipo"
          defaultValue={acceso?.dispositivoTipo ?? ''}
        >
          {DISPOSITIVOS.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.etiqueta}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo
        etiqueta="Identificación del interruptor"
        htmlFor="dispositivoRef"
        ayuda="El puerto serie, la IP en la red local o el identificador del dispositivo, según el tipo."
      >
        <Input
          id="dispositivoRef"
          name="dispositivoRef"
          defaultValue={acceso?.dispositivoRef ?? ''}
          placeholder="COM3 · 192.168.1.50 · 10012a4bcd"
        />
      </Campo>
    </>
  );
}

export function AccesosCliente({
  accesos,
  predios,
}: {
  accesos: AccesoEnLista[];
  predios: PredioOpcion[];
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
          <CamposAcceso predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Acceso</Th>
          <Th>Predio</Th>
          <Th>Tipo</Th>
          <Th>Interruptor</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {accesos.length === 0 && (
            <Vacio columnas={6}>
              {predios.length === 0
                ? 'Primero cargá un predio.'
                : 'Todavía no hay accesos cargados.'}
            </Vacio>
          )}

          {accesos.map((a) => {
            const porNube = a.dispositivoTipo === 'sonoff_cloud';
            return (
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
                <Td>
                  {a.dispositivoTipo ? (
                    <div>
                      <div className="text-xs">
                        {DISPOSITIVOS.find((d) => d.valor === a.dispositivoTipo)?.etiqueta ??
                          a.dispositivoTipo}
                      </div>
                      {a.dispositivoRef && (
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {a.dispositivoRef}
                        </div>
                      )}
                      {porNube && a.predioSatelital && (
                        <div className="mt-1 text-[11px] text-marca">
                          Va por la nube en un predio satelital: revisar.
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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
                      <CamposAcceso acceso={a} predios={predios} />
                    </DialogoFormulario>

                    <BotonAccion accion={alternarAcceso} id={a.id}>
                      {a.activo ? 'Dar de baja' : 'Reactivar'}
                    </BotonAccion>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>
    </>
  );
}
