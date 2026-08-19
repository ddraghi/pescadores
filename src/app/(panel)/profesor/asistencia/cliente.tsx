'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, ErrorFormulario, Selector } from '@/components/ui/campos';
import { tomarAsistencia } from '@/lib/acciones/actividades';
import { cn } from '@/lib/utils';
import type { GrupoEnLista } from '@/app/(panel)/profesor/grupos/cliente';

/**
 * Toma de asistencia.
 *
 * Todos arrancan marcados presentes y se destildan las faltas, que es lo que menos
 * clics pide: en una clase normal faltan dos o tres, no la mitad.
 */
export function AsistenciaCliente({
  grupos,
  yaTomadas,
}: {
  grupos: GrupoEnLista[];
  /** Asistencias ya cargadas: clave `grupoId|fecha`, valor los socios presentes. */
  yaTomadas: Record<string, string[]>;
}) {
  const router = useRouter();
  const [estado, enviar, enviando] = useActionState(tomarAsistencia, null);

  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? '');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const grupo = grupos.find((g) => g.id === grupoId);

  const clave = `${grupoId}|${fecha}`;
  const previas = yaTomadas[clave];

  const [presentes, setPresentes] = useState<string[]>([]);

  // Al cambiar de grupo o de fecha se recarga lo que ya estaba cargado, o se marcan
  // todos presentes si es la primera vez.
  useEffect(() => {
    if (!grupo) return;
    setPresentes(previas ?? grupo.inscriptos.map((i) => i.socioId));
  }, [grupoId, fecha, grupo, previas]);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  function alternar(socioId: string) {
    setPresentes((p) => (p.includes(socioId) ? p.filter((x) => x !== socioId) : [...p, socioId]));
  }

  if (grupos.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
        No tenés grupos activos. Armá uno en «Mis grupos».
      </p>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="grupoId" value={grupoId} />
      <input type="hidden" name="fecha" value={fecha} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Grupo" htmlFor="grupo">
          <Selector id="grupo" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} — {g.actividadNombre}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Fecha de la clase" htmlFor="f">
          <Input id="f" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
      </div>

      {previas && (
        <p className="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
          Esta clase ya tiene asistencia cargada. Si la volvés a guardar, se reemplaza.
        </p>
      )}

      {grupo && grupo.inscriptos.length === 0 ? (
        <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Este grupo todavía no tiene alumnos inscriptos.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {presentes.length} de {grupo?.inscriptos.length} presentes
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPresentes(grupo?.inscriptos.map((i) => i.socioId) ?? [])}
              >
                Todos
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPresentes([])}>
                Ninguno
              </Button>
            </div>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {grupo?.inscriptos.map((i) => {
              const presente = presentes.includes(i.socioId);
              return (
                <button
                  key={i.socioId}
                  type="button"
                  onClick={() => alternar(i.socioId)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    presente ? 'bg-paso-ok/10' : 'bg-card hover:bg-secondary',
                  )}
                >
                  {presente && <input type="hidden" name="presente" value={i.socioId} />}
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                      presente ? 'border-paso-ok bg-paso-ok' : 'border-border',
                    )}
                  >
                    {presente && <Check className="size-3.5 text-paso-ok-foreground" />}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{i.numeroSocio}</span>
                  <span className="flex-1">{i.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {presente ? 'presente' : 'ausente'}
                  </span>
                </button>
              );
            })}
          </div>

          {estado && !estado.ok && <ErrorFormulario mensaje={estado.error} />}

          <Button type="submit" size="lg" disabled={enviando}>
            {enviando && <Loader2 className="animate-spin" />}
            Guardar asistencia
          </Button>
        </>
      )}
    </form>
  );
}
