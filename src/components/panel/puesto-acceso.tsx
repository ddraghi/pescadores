'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { Pastilla } from '@/components/panel/tabla';
import {
  buscarPersona,
  evaluarAcceso,
  confirmarIngreso,
  type PersonaEncontrada,
  type Evaluacion,
} from '@/lib/acciones/porteria';
import { claseCartel } from '@/lib/acceso';
import { CONDICIONES, MEDIOS_PAGO } from '@/lib/tarifario';
import { ESTADOS, type NombreEstado } from '@/lib/socios';
import { pesos } from '@/lib/utils';

export interface AccesoOperable {
  id: string;
  nombre: string;
  tipo: 'PORTERIA' | 'CONTROL';
  predioNombre: string;
}

/**
 * El puesto de acceso: identificar, ver el veredicto, cobrar si corresponde y abrir.
 *
 * Está pensado para una pantalla táctil a la intemperie y para usarse con cola de gente
 * atrás: todo grande, pocos pasos, y el cartel del veredicto ocupa media pantalla para
 * que se lea desde lejos.
 *
 * La misma pantalla sirve para la portería y para un punto de control. La diferencia es
 * `puedeCobrar`: el control no muestra plata en ninguna parte.
 */
export function PuestoAcceso({
  accesos,
  puedeCobrar,
  tieneCajaAbierta,
}: {
  accesos: AccesoOperable[];
  puedeCobrar: boolean;
  tieneCajaAbierta: boolean;
}) {
  const router = useRouter();
  const [accesoId, setAccesoId] = useState(accesos[0]?.id ?? '');
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<PersonaEncontrada[]>([]);
  const [buscando, iniciarBusqueda] = useTransition();

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [visita, setVisita] = useState<{ nombre: string; condicion: string } | null>(null);
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [error, setError] = useState<string | null>(null);
  const [confirmando, iniciarConfirmacion] = useTransition();

  const cajaBusqueda = useRef<HTMLInputElement>(null);
  const acceso = accesos.find((a) => a.id === accesoId);

  // Búsqueda con una pausa: el portero tipea rápido y no hace falta una consulta por tecla.
  useEffect(() => {
    if (termino.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      iniciarBusqueda(async () => {
        setResultados(await buscarPersona(termino));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [termino]);

  function volverAEmpezar() {
    setEvaluacion(null);
    setPersonaId(null);
    setVisita(null);
    setTermino('');
    setResultados([]);
    setError(null);
    cajaBusqueda.current?.focus();
  }

  async function evaluar(opciones: { personaId?: string; nombreVisita?: string; condicion?: string }) {
    setError(null);
    const r = await evaluarAcceso({ accesoId, ...opciones });
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setEvaluacion(r);
  }

  function elegirPersona(p: PersonaEncontrada) {
    setPersonaId(p.personaId);
    setVisita(null);
    iniciarBusqueda(async () => evaluar({ personaId: p.personaId }));
  }

  function registrarVisita(nombre: string, condicion: string) {
    setPersonaId(null);
    setVisita({ nombre, condicion });
    iniciarBusqueda(async () => evaluar({ nombreVisita: nombre, condicion }));
  }

  function confirmar(permitir: boolean) {
    if (!evaluacion) return;
    const cobra = permitir && puedeCobrar && evaluacion.precio !== null && evaluacion.precio > 0;

    const datos = new FormData();
    datos.set('accesoId', accesoId);
    if (personaId) datos.set('personaId', personaId);
    datos.set('nombre', evaluacion.nombre);
    datos.set('permitido', permitir ? 'si' : 'no');
    datos.set('motivo', evaluacion.decision.motivo);
    datos.set('condicion', evaluacion.decision.cobrarComo ?? visita?.condicion ?? 'SOCIO');
    if (cobra) {
      datos.set('concepto', evaluacion.concepto ?? '');
      datos.set('importe', String(evaluacion.precio));
      datos.set('medioPago', medioPago);
    }

    iniciarConfirmacion(async () => {
      const r = await confirmarIngreso(null, datos);
      if (r.ok) {
        volverAEmpezar();
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  if (accesos.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-muted-foreground">
        No tenés ningún puesto asignado. Pedile al Secretario que te asigne uno.
      </p>
    );
  }

  // ── Paso 2: el veredicto ───────────────────────────────────────────────────
  if (evaluacion) {
    const { decision, precio, concepto, faltaPrecio } = evaluacion;
    const cobra = puedeCobrar && precio !== null && precio > 0;
    const puedeAbrir = decision.veredicto !== 'NO_PASA';

    return (
      <div className="flex flex-col gap-4">
        <div className={`${claseCartel(decision.veredicto)} rounded-xl`}>
          <div>{decision.titulo}</div>
          <div className="detalle">{evaluacion.nombre}</div>
        </div>

        <p className="text-center text-lg">{decision.detalle}</p>

        {puedeCobrar && faltaPrecio && (
          <p className="rounded-md bg-accent/10 px-4 py-3 text-center text-marca">
            Corresponde cobrar <strong>{concepto}</strong>, pero no hay precio cargado en el
            tarifario para este predio y esta condición. Avisale a Tesorería.
          </p>
        )}

        {cobra && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg">{concepto}</span>
              <span className="text-3xl font-bold tabular-nums">{pesos(precio)}</span>
            </div>
            {tieneCajaAbierta ? (
              <Campo etiqueta="Medio de pago" htmlFor="medio">
                <Selector id="medio" value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
                  {Object.entries(MEDIOS_PAGO).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </Selector>
              </Campo>
            ) : (
              <p className="text-sm text-marca">
                No tenés la caja abierta. Abrila en «Mi caja» antes de cobrar.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-accent/10 px-4 py-3 text-center text-marca">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            size="lg"
            className="h-16 text-lg"
            disabled={confirmando || !puedeAbrir || (cobra && !tieneCajaAbierta)}
            onClick={() => confirmar(true)}
          >
            {confirmando && <Loader2 className="animate-spin" />}
            {cobra ? `Cobrar y abrir` : 'Abrir'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg"
            disabled={confirmando}
            onClick={() => confirmar(false)}
          >
            No dejar pasar
          </Button>
        </div>

        <Button variant="ghost" onClick={volverAEmpezar} disabled={confirmando}>
          <X />
          Cancelar y volver
        </Button>
      </div>
    );
  }

  // ── Paso 1: identificar ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {accesos.length > 1 && (
        <Campo etiqueta="Puesto" htmlFor="acceso">
          <Selector id="acceso" value={accesoId} onChange={(e) => setAccesoId(e.target.value)}>
            {accesos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.predioNombre} · {a.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
      )}

      {acceso && accesos.length === 1 && (
        <p className="text-center text-sm text-muted-foreground">
          {acceso.predioNombre} · {acceso.nombre}
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={cajaBusqueda}
          autoFocus
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Nombre, DNI o número de socio"
          className="h-16 pl-12 text-lg"
        />
        {buscando && (
          <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-accent/10 px-4 py-3 text-marca">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {resultados.map((p) => (
          <button
            key={p.personaId}
            onClick={() => elegirPersona(p)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-medium">{p.nombre}</div>
              <div className="font-mono text-xs text-muted-foreground">
                DNI {p.dni}
                {p.numeroSocio !== null && ` · socio ${p.numeroSocio}`}
              </div>
            </div>
            {p.esSocio ? (
              <Pastilla tono={p.estado === 'AL_DIA' ? 'activo' : 'neutro'}>
                {ESTADOS[p.estado as NombreEstado] ?? p.estado}
              </Pastilla>
            ) : (
              <Pastilla>No socio</Pastilla>
            )}
          </button>
        ))}

        {termino.trim().length >= 2 && !buscando && resultados.length === 0 && (
          <p className="py-4 text-center text-muted-foreground">Nadie coincide con esa búsqueda.</p>
        )}
      </div>

      {puedeCobrar && <FormularioVisita alRegistrar={registrarVisita} />}
    </div>
  );
}

/** Alta rápida de alguien que no está en el padrón: la mayoría de los que llegan. */
function FormularioVisita({
  alRegistrar,
}: {
  alRegistrar: (nombre: string, condicion: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [condicion, setCondicion] = useState('NO_SOCIO');

  if (!abierto) {
    return (
      <Button variant="outline" size="lg" className="h-14" onClick={() => setAbierto(true)}>
        <UserPlus />
        No está en el padrón
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <Campo etiqueta="Nombre" htmlFor="nombre-visita">
        <Input
          id="nombre-visita"
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="h-12"
        />
      </Campo>
      <Campo
        etiqueta="Condición"
        htmlFor="condicion-visita"
        ayuda="Define qué tarifa le corresponde."
      >
        <Selector
          id="condicion-visita"
          value={condicion}
          onChange={(e) => setCondicion(e.target.value)}
          className="h-12"
        >
          {Object.entries(CONDICIONES)
            .filter(([v]) => v !== 'SOCIO')
            .map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
        </Selector>
      </Campo>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={nombre.trim().length < 3}
          onClick={() => alRegistrar(nombre.trim(), condicion)}
        >
          Continuar
        </Button>
        <Button variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
