'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { PARENTESCOS } from '@/lib/socios';
import type { FamiliarEnFicha } from '@/lib/datos/socios';

/**
 * Los integrantes del grupo familiar, dentro de la ficha del titular.
 *
 * El grupo no es una entidad aparte que haya que crear y bautizar: se llama como el
 * titular. Acá sólo se cargan los que cuelgan de él, y cada uno queda en el padrón como
 * un socio más —con su número y su ficha—, no como un anexo de esta pantalla.
 *
 * Las casillas de cada fila viajan como listas paralelas (`fam.nombre` una vez por
 * fila) y la acción las lee por posición, así que todas las filas mandan todos sus
 * campos aunque estén vacíos.
 */

interface Fila extends Partial<FamiliarEnFicha> {
  /** Clave estable de React. No viaja al servidor. */
  clave: string;
}

export function GrupoFamiliar({
  nombreTitular,
  familiares,
  perteneceA,
  proximoNumero,
}: {
  /** Nombre del socio de esta ficha: es como se llama el grupo. */
  nombreTitular: string;
  familiares: FamiliarEnFicha[];
  /** Si este socio cuelga de otro, el nombre de ese titular. */
  perteneceA: string | null;
  proximoNumero: number;
}) {
  const [esGrupo, setEsGrupo] = useState(familiares.length > 0);
  const [filas, setFilas] = useState<Fila[]>(
    familiares.map((f) => ({ ...f, clave: f.id })),
  );
  const [contador, setContador] = useState(0);

  // Un socio que ya integra el grupo de otro no puede encabezar uno propio: el grupo
  // es de un solo nivel y encadenarlos rompe la cuenta de quién paga la cuota.
  if (perteneceA) {
    return (
      <div className="rounded-md border border-border bg-secondary px-3 py-2.5 text-sm">
        Integra el grupo familiar de <strong>{perteneceA}</strong>, que paga la cuota por
        todos.
        <p className="mt-1 text-xs text-muted-foreground">
          Para sacarlo del grupo o cambiarle el parentesco, editá la ficha de {perteneceA}.
        </p>
      </div>
    );
  }

  function agregar() {
    setFilas((f) => [...f, { clave: `nuevo-${contador}` }]);
    setContador((c) => c + 1);
  }

  function quitar(clave: string) {
    setFilas((f) => f.filter((x) => x.clave !== clave));
  }

  const habia = familiares.length > 0;

  return (
    <>
      <Casilla
        name="esGrupoFamiliar"
        etiqueta="Es un grupo familiar"
        ayuda={`El grupo se llama como el titular${nombreTitular ? `: «${nombreTitular}»` : ''}, que es quien paga la cuota por todos.`}
        checked={esGrupo}
        onChange={(e) => setEsGrupo(e.target.checked)}
      />

      {!esGrupo && habia && (
        <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-marca">
          Al guardar, los {familiares.length} integrantes quedan sueltos y cada uno pasa a
          pagar su cuota individual. No se borra a nadie del padrón.
        </p>
      )}

      {esGrupo && (
        <div className="space-y-3">
          {filas.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Todavía no cargaste integrantes.
            </p>
          )}

          {filas.map((f, i) => (
            <div key={f.clave} className="space-y-3 rounded-md border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Integrante {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => quitar(f.clave)}
                  aria-label={`Quitar a ${f.nombre ?? 'este integrante'} del grupo`}
                >
                  <X className="size-3.5" />
                  Quitar
                </Button>
              </div>

              <input type="hidden" name="fam.id" value={f.id ?? ''} />

              <Campo etiqueta="Nombre y apellido" htmlFor={`fn-${f.clave}`}>
                <Input id={`fn-${f.clave}`} name="fam.nombre" defaultValue={f.nombre ?? ''} required />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="DNI" htmlFor={`fd-${f.clave}`} ayuda="Sin puntos.">
                  <Input
                    id={`fd-${f.clave}`}
                    name="fam.dni"
                    inputMode="numeric"
                    defaultValue={f.dni ?? ''}
                    required
                  />
                </Campo>
                <Campo etiqueta="Fecha de nacimiento" htmlFor={`fb-${f.clave}`}>
                  <Input
                    id={`fb-${f.clave}`}
                    name="fam.fechaNacimiento"
                    type="date"
                    defaultValue={f.fechaNacimiento ?? ''}
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo
                  etiqueta="N° de socio"
                  htmlFor={`fs-${f.clave}`}
                  ayuda={f.id ? undefined : 'Cada integrante tiene el suyo.'}
                >
                  <Input
                    id={`fs-${f.clave}`}
                    name="fam.numeroSocio"
                    type="number"
                    min={1}
                    defaultValue={f.numeroSocio ?? proximoNumero + i}
                    required
                  />
                </Campo>
                <Campo etiqueta="Parentesco" htmlFor={`fp-${f.clave}`}>
                  <Selector id={`fp-${f.clave}`} name="fam.parentesco" defaultValue={f.parentesco ?? ''}>
                    <option value="">Sin especificar</option>
                    {PARENTESCOS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Selector>
                </Campo>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={agregar} className="w-full">
            <Plus />
            Agregar integrante
          </Button>

          <p className="text-xs text-muted-foreground">
            Cada integrante queda en el padrón como un socio más. La categoría sale de la
            fecha de nacimiento —cadete hasta los 18 (art. 14 inc. d)— y después se
            cambia desde el padrón, donde queda asentada. Si el DNI ya está cargado, se
            suma al grupo el socio que ya existe en vez de duplicarlo.
          </p>
        </div>
      )}
    </>
  );
}
