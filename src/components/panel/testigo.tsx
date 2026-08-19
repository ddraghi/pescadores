'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accionar } from '@/lib/acciones/dispositivos';
import { PROPOSITOS, type EstadoVisible, type NombreProposito } from '@/lib/dispositivos';

export interface DispositivoTestigo {
  id: string;
  nombre: string;
  proposito: string;
  ubicacion: string | null;
  estado: EstadoVisible;
  requiereConfirmacion: boolean;
  activo: boolean;
  /** Cuándo fue la última lectura, ya en texto. */
  estadoEn: string | null;
}

const COLORES: Record<EstadoVisible, string> = {
  ENCENDIDO: 'bg-paso-ok border-paso-ok',
  APAGADO: 'bg-muted border-border',
  SIN_DATO: 'bg-transparent border-dashed border-muted-foreground/50',
};

const TEXTOS: Record<EstadoVisible, string> = {
  ENCENDIDO: 'Encendido',
  APAGADO: 'Apagado',
  SIN_DATO: 'Sin dato',
};

/**
 * Luz testigo de un dispositivo. Tres estados, no dos.
 *
 * SIN_DATO no es un detalle de diseño: si la última lectura quedó vieja, mostrar
 * «apagado» llevaría a que alguien apriete creyendo que enciende una bomba, y en
 * realidad la apague. Con el estado desconocido el testigo se pone gris punteado y no
 * se deja tocar. Preferimos no poder operar antes que operar a ciegas.
 */
export function Testigo({
  dispositivo,
  puedeOperar,
  compacto,
}: {
  dispositivo: DispositivoTestigo;
  puedeOperar: boolean;
  compacto?: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sinDato = dispositivo.estado === 'SIN_DATO';
  const encendido = dispositivo.estado === 'ENCENDIDO';
  const bloqueado = !puedeOperar || sinDato || !dispositivo.activo || pendiente;

  function alternar() {
    if (bloqueado) return;
    if (
      dispositivo.requiereConfirmacion &&
      !window.confirm(
        `¿${encendido ? 'Apagar' : 'Encender'} ${dispositivo.nombre}? Queda registrado a tu nombre.`,
      )
    ) {
      return;
    }

    setError(null);
    iniciar(async () => {
      // Orden absoluta, nunca «invertir»: si se duplica, no pasa nada.
      const r = await accionar(dispositivo.id, !encendido);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className={cn('flex flex-col', compacto ? 'items-center gap-1' : 'gap-1.5')}>
      <button
        type="button"
        onClick={alternar}
        disabled={bloqueado}
        aria-label={`${dispositivo.nombre}: ${TEXTOS[dispositivo.estado]}`}
        title={
          sinDato
            ? 'Sin dato del estado: no se puede accionar a ciegas'
            : `${TEXTOS[dispositivo.estado]}${dispositivo.estadoEn ? ` · leído ${dispositivo.estadoEn}` : ''}`
        }
        className={cn(
          'flex items-center gap-2 rounded-full border-2 transition-all',
          compacto ? 'size-7 justify-center' : 'px-3 py-1.5',
          COLORES[dispositivo.estado],
          encendido && 'shadow-[0_0_12px_hsl(var(--paso-ok)/0.6)]',
          bloqueado ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105',
        )}
      >
        {pendiente ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <span
            className={cn(
              'block rounded-full',
              compacto ? 'size-2.5' : 'size-2',
              encendido ? 'bg-paso-ok-foreground' : sinDato ? 'bg-muted-foreground/60' : 'bg-muted-foreground',
            )}
          />
        )}
        {!compacto && (
          <span className={cn('text-xs font-medium', encendido && 'text-paso-ok-foreground')}>
            {TEXTOS[dispositivo.estado]}
          </span>
        )}
      </button>

      {!compacto && (
        <div className="text-[11px] text-muted-foreground">
          {PROPOSITOS[dispositivo.proposito as NombreProposito] ?? dispositivo.proposito}
        </div>
      )}

      {error && (
        <p role="alert" className="max-w-48 text-[11px] text-marca">
          {error}
        </p>
      )}
    </div>
  );
}
