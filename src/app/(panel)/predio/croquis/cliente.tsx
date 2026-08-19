'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Move, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Testigo, type DispositivoTestigo } from '@/components/panel/testigo';
import { subirCroquis, borrarCroquis, ubicarEnCroquis } from '@/lib/acciones/dispositivos';
import { PROPOSITOS, type NombreProposito } from '@/lib/dispositivos';
import { cn } from '@/lib/utils';

export interface DispositivoUbicado extends DispositivoTestigo {
  x: number;
  y: number;
}

export interface CroquisEnLista {
  id: string;
  nombre: string;
  archivo: string;
  predioNombre: string;
  dispositivos: DispositivoUbicado[];
}

export interface SinUbicar {
  id: string;
  nombre: string;
  proposito: string;
}

/**
 * Croquis de un sector con los dispositivos encima.
 *
 * Las coordenadas se guardan en PORCENTAJE del ancho y del alto de la imagen, no en
 * píxeles: así el croquis se ve igual en el monitor de la oficina, en una tablet y en un
 * celular, sin que los testigos se despeguen de su lugar.
 */
export function CroquisCliente({
  croquis,
  sinUbicar,
  predios,
  puedeAdministrar,
}: {
  croquis: CroquisEnLista[];
  sinUbicar: SinUbicar[];
  predios: { id: string; nombre: string }[];
  puedeAdministrar: boolean;
}) {
  const router = useRouter();
  const [activo, setActivo] = useState(croquis[0]?.id ?? '');
  const [moviendo, setMoviendo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [, iniciar] = useTransition();
  const imagen = useRef<HTMLDivElement>(null);

  const actual = croquis.find((c) => c.id === activo);

  /** Al hacer clic sobre el croquis con un dispositivo tomado, lo deja ahí. */
  function soltar(e: React.MouseEvent<HTMLDivElement>) {
    if (!moviendo || !imagen.current) return;
    const caja = imagen.current.getBoundingClientRect();
    const x = ((e.clientX - caja.left) / caja.width) * 100;
    const y = ((e.clientY - caja.top) / caja.height) * 100;

    const id = moviendo;
    setMoviendo(null);
    iniciar(async () => {
      await ubicarEnCroquis(id, activo, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
      router.refresh();
    });
  }

  function quitarDelCroquis(id: string) {
    iniciar(async () => {
      await ubicarEnCroquis(id, null, null, null);
      router.refresh();
    });
  }

  const visibles = actual
    ? filtro
      ? actual.dispositivos.filter((d) => d.proposito === filtro)
      : actual.dispositivos
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {croquis.map((c) => (
            <Button
              key={c.id}
              variant={activo === c.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActivo(c.id);
                setMoviendo(null);
              }}
            >
              {c.nombre}
              <span className="ml-1 text-xs opacity-70">{c.predioNombre}</span>
            </Button>
          ))}
        </div>

        {puedeAdministrar && (
          <DialogoFormulario
            titulo="Nuevo croquis"
            descripcion="Una imagen del sector: un croquis a mano alcanza. Después se le ubican los dispositivos encima."
            accion={subirCroquis}
            textoGuardar="Subir"
            disparador={
              <Button variant="outline">
                <ImagePlus />
                Nuevo croquis
              </Button>
            }
          >
            <Campo etiqueta="Nombre del sector" htmlFor="nombre">
              <Input id="nombre" name="nombre" placeholder="Sector camping" required autoFocus />
            </Campo>
            <Campo etiqueta="Predio" htmlFor="predioId">
              <Selector id="predioId" name="predioId" required>
                {predios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Imagen" htmlFor="imagen" ayuda="Hasta 8 MB.">
              <input
                id="imagen"
                name="imagen"
                type="file"
                accept="image/*"
                required
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:py-2 file:text-sm"
              />
            </Campo>
          </DialogoFormulario>
        )}
      </div>

      {!actual && (
        <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Todavía no hay croquis cargados. Subí uno por sector: tres o cuatro por predio suele
          alcanzar.
        </p>
      )}

      {actual && (
        <>
          {actual.dispositivos.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Button variant={filtro === '' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('')}>
                Todos
              </Button>
              {[...new Set(actual.dispositivos.map((d) => d.proposito))].map((p) => (
                <Button
                  key={p}
                  variant={filtro === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltro(p)}
                >
                  {PROPOSITOS[p as NombreProposito] ?? p}
                </Button>
              ))}
            </div>
          )}

          {moviendo && (
            <p className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-marca">
              Hacé clic sobre el croquis para ubicar el dispositivo.{' '}
              <button className="underline" onClick={() => setMoviendo(null)}>
                Cancelar
              </button>
            </p>
          )}

          <div
            ref={imagen}
            onClick={soltar}
            className={cn(
              'relative overflow-hidden rounded-lg border border-border bg-card',
              moviendo && 'cursor-crosshair ring-2 ring-accent',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/croquis/${actual.archivo}`}
              alt={`Croquis de ${actual.nombre}`}
              className="block w-full select-none"
              draggable={false}
            />

            {visibles.map((d) => (
              <div
                key={d.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <Testigo dispositivo={d} puedeOperar compacto />
                  <span className="whitespace-nowrap rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
                    {d.nombre}
                  </span>
                  {puedeAdministrar && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoviendo(d.id);
                      }}
                      className="rounded bg-background/85 p-0.5 text-muted-foreground hover:text-foreground"
                      title="Mover"
                    >
                      <Move className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {puedeAdministrar && (
            <div className="flex flex-wrap items-start justify-between gap-4">
              {sinUbicar.length > 0 && (
                <div className="flex-1">
                  <p className="mb-2 text-sm font-medium">Sin ubicar en ningún croquis</p>
                  <div className="flex flex-wrap gap-2">
                    {sinUbicar.map((d) => (
                      <Button
                        key={d.id}
                        variant={moviendo === d.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMoviendo(d.id)}
                      >
                        {d.nombre}
                        <span className="text-xs opacity-70">
                          {PROPOSITOS[d.proposito as NombreProposito] ?? d.proposito}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {actual.dispositivos.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => quitarDelCroquis(actual.dispositivos[0].id)}
                    title="Saca el primero del croquis, sin borrarlo"
                  >
                    Quitar {actual.dispositivos[0].nombre}
                  </Button>
                )}
                <BotonAccion
                  accion={borrarCroquis}
                  id={actual.id}
                  confirmar={`¿Borrar el croquis «${actual.nombre}»? Los dispositivos no se borran: quedan sin ubicar.`}
                >
                  <Trash2 className="size-3.5" />
                  Borrar croquis
                </BotonAccion>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
