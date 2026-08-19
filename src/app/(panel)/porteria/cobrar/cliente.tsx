'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, ErrorFormulario, Selector } from '@/components/ui/campos';
import { Pastilla } from '@/components/panel/tabla';
import { buscarPersona, type PersonaEncontrada } from '@/lib/acciones/porteria';
import { cobrarEnMostrador } from '@/lib/acciones/cobro-mostrador';
import { CONDICIONES, MEDIOS_PAGO } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

export interface ConceptoDisponible {
  concepto: string;
  /** Precio por condición, para mostrarlo antes de cobrar. */
  precios: Record<string, number>;
}

/**
 * Mostrador de la portería: cobra cualquier concepto del tarifario.
 *
 * Los precios que se muestran son informativos; el importe real lo recalcula el
 * servidor contra el tarifario al confirmar. El navegador nunca decide cuánto se cobra.
 */
export function CobrarCliente({
  conceptos,
  predioNombre,
}: {
  conceptos: ConceptoDisponible[];
  predioNombre: string | null;
}) {
  const router = useRouter();
  const [estado, enviar, enviando] = useActionState(cobrarEnMostrador, null);

  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<PersonaEncontrada[]>([]);
  const [buscando, iniciarBusqueda] = useTransition();
  const [elegida, setElegida] = useState<PersonaEncontrada | null>(null);

  const [condicion, setCondicion] = useState('SOCIO');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  useEffect(() => {
    if (estado?.ok) {
      setElegida(null);
      setTermino('');
      setResultados([]);
      setCantidades({});
      router.refresh();
    }
  }, [estado, router]);

  useEffect(() => {
    if (termino.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      iniciarBusqueda(async () => setResultados(await buscarPersona(termino)));
    }, 300);
    return () => clearTimeout(t);
  }, [termino]);

  const elegidos = Object.entries(cantidades).filter(([, c]) => c > 0);
  const total = elegidos.reduce(
    (s, [concepto, cant]) => s + (conceptos.find((c) => c.concepto === concepto)?.precios[condicion] ?? 0) * cant,
    0,
  );

  function cambiar(concepto: string, delta: number) {
    setCantidades((previas) => {
      const nueva = Math.max(0, (previas[concepto] ?? 0) + delta);
      return { ...previas, [concepto]: nueva };
    });
  }

  if (!predioNombre) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-muted-foreground">
        Abrí tu caja en «Mi caja» antes de cobrar en el mostrador.
      </p>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">Cobrando en {predioNombre}.</p>

      {/* A quién se le cobra */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">¿A quién?</p>
        {elegida ? (
          <div className="flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3">
            <input type="hidden" name="personaId" value={elegida.personaId} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{elegida.nombre}</div>
              <div className="font-mono text-xs text-muted-foreground">DNI {elegida.dni}</div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setElegida(null)}>
              Cambiar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
                placeholder="Buscar socio por nombre, DNI o número"
                className="h-12 pl-9"
              />
              {buscando && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {resultados.map((p) => (
              <button
                key={p.personaId}
                type="button"
                onClick={() => setElegida(p)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-secondary"
              >
                <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                {p.numeroSocio !== null && <Pastilla>socio {p.numeroSocio}</Pastilla>}
              </button>
            ))}
            <Campo etiqueta="O escribí el nombre de quien paga" htmlFor="nombre">
              <Input id="nombre" name="nombre" placeholder="Visitante" />
            </Campo>
          </>
        )}
      </div>

      <Campo
        etiqueta="Condición"
        htmlFor="condicion"
        ayuda="Define qué precio del tarifario se aplica."
      >
        <Selector
          id="condicion"
          name="condicion"
          value={condicion}
          onChange={(e) => setCondicion(e.target.value)}
          className="h-12"
        >
          {Object.entries(CONDICIONES).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      {/* Conceptos */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">¿Qué se cobra?</p>
        {conceptos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay conceptos con precio cargado para este predio.
          </p>
        )}
        {conceptos.map((c) => {
          const cant = cantidades[c.concepto] ?? 0;
          const precio = c.precios[condicion];
          return (
            <div
              key={c.concepto}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                cant > 0 ? 'border-accent/40 bg-accent/10' : 'border-border bg-card'
              }`}
            >
              {cant > 0 && (
                <>
                  <input type="hidden" name="concepto" value={c.concepto} />
                  <input type="hidden" name={`cantidad_${c.concepto}`} value={cant} />
                </>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate">{c.concepto}</div>
                <div className="text-xs text-muted-foreground">
                  {precio === undefined ? 'sin precio para esta condición' : pesos(precio)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={cant === 0}
                  onClick={() => cambiar(c.concepto, -1)}
                >
                  −
                </Button>
                <span className="w-8 text-center tabular-nums">{cant}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={precio === undefined}
                  onClick={() => cambiar(c.concepto, 1)}
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
        <span className="font-medium">Total</span>
        <span className="text-2xl font-bold tabular-nums">{pesos(total)}</span>
      </div>

      <Campo etiqueta="Medio de pago" htmlFor="medioPago">
        <Selector id="medioPago" name="medioPago" defaultValue="EFECTIVO" className="h-12">
          {Object.entries(MEDIOS_PAGO).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      {estado && !estado.ok && <ErrorFormulario mensaje={estado.error} />}

      <Button type="submit" size="lg" className="h-14 text-lg" disabled={enviando || elegidos.length === 0}>
        {enviando && <Loader2 className="animate-spin" />}
        Cobrar {pesos(total)}
      </Button>
    </form>
  );
}
