'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorFormulario } from '@/components/ui/campos';
import {
  Dialogo,
  DisparadorDialogo,
  ContenidoDialogo,
  TituloDialogo,
  DescripcionDialogo,
  CierreDialogo,
} from '@/components/ui/dialogo';

type Resp = { ok: true } | { ok: false; error: string };
type Accion = (prev: Resp | null, datos: FormData) => Promise<Resp>;

/**
 * Diálogo con un formulario atado a una acción del servidor. Se cierra solo cuando la
 * acción sale bien, y muestra el motivo adentro cuando falla —sin perder lo tipeado,
 * que es lo que más molesta de un formulario que se cierra al primer error.
 */
export function DialogoFormulario({
  titulo,
  descripcion,
  disparador,
  accion,
  children,
  textoGuardar = 'Guardar',
}: {
  titulo: string;
  descripcion?: string;
  disparador: React.ReactNode;
  accion: Accion;
  children: React.ReactNode;
  textoGuardar?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [estado, enviar, pendiente] = React.useActionState(accion, null);

  React.useEffect(() => {
    if (estado?.ok) {
      setAbierto(false);
      router.refresh();
    }
  }, [estado, router]);

  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DisparadorDialogo asChild>{disparador}</DisparadorDialogo>
      <ContenidoDialogo>
        <div className="space-y-1">
          <TituloDialogo>{titulo}</TituloDialogo>
          {descripcion && <DescripcionDialogo>{descripcion}</DescripcionDialogo>}
        </div>

        <form action={enviar} className="space-y-4">
          {children}
          {estado && !estado.ok && <ErrorFormulario mensaje={estado.error} />}
          <div className="flex justify-end gap-2 pt-2">
            <CierreDialogo asChild>
              <Button type="button" variant="outline" disabled={pendiente}>
                Cancelar
              </Button>
            </CierreDialogo>
            <Button type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="animate-spin" />}
              {pendiente ? 'Guardando…' : textoGuardar}
            </Button>
          </div>
        </form>
      </ContenidoDialogo>
    </Dialogo>
  );
}

/**
 * Botón que dispara una acción simple sobre un registro (dar de baja, volver a
 * habilitar, quitar un rol). Pide confirmación cuando la acción lo amerita.
 */
export function BotonAccion({
  accion,
  id,
  children,
  confirmar,
  className,
}: {
  accion: (id: string) => Promise<Resp>;
  id: string;
  children: React.ReactNode;
  confirmar?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function ejecutar() {
    if (confirmar && !window.confirm(confirmar)) return;
    setError(null);
    iniciar(async () => {
      const r = await accion(id);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={ejecutar} disabled={pendiente} className={className}>
        {pendiente ? <Loader2 className="animate-spin" /> : children}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-marca">
          {error}
        </p>
      )}
    </>
  );
}
