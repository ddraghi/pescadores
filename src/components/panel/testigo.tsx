'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accionar } from '@/lib/acciones/dispositivos';
import {
  PROPOSITOS,
  muestraConexion,
  type Conexion,
  type EstadoVisible,
  type NombreProposito,
} from '@/lib/dispositivos';

export interface DispositivoTestigo {
  id: string;
  nombre: string;
  proposito: string;
  ubicacion: string | null;
  estado: EstadoVisible;
  /** Si el aparato está respondiendo. Es lo único que se muestra de los de acceso. */
  conexion: Conexion;
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
 * Testigo de un aparato de acceso: sólo dice si está en línea.
 *
 * No se toca y no informa encendido ni apagado. El MINI-D de una portería trabaja por
 * pulso —abre y vuelve solo—, así que su relé está en reposo casi siempre y mostrarlo
 * sería mentir sobre el estado de la puerta. Abrir se hace desde la pantalla del
 * portero o del punto de control, que es donde además queda registrado quién pasó.
 */
function TestigoDeConexion({
  dispositivo,
  compacto,
}: {
  dispositivo: DispositivoTestigo;
  compacto?: boolean;
}) {
  const enLinea = dispositivo.conexion === 'EN_LINEA' && dispositivo.activo;

  return (
    <div className={cn('flex flex-col', compacto ? 'items-center gap-1' : 'gap-1.5')}>
      <div
        aria-label={`${dispositivo.nombre}: ${enLinea ? 'en línea' : 'sin conexión'}`}
        title={
          enLinea
            ? `En línea${dispositivo.estadoEn ? ` · reportó ${dispositivo.estadoEn}` : ''}. Se abre desde la pantalla de la portería.`
            : 'Sin conexión: el nodo del predio no está reportando este aparato.'
        }
        className={cn(
          'flex items-center gap-2 rounded-full border-2',
          compacto ? 'size-7 justify-center' : 'px-3 py-1.5',
          enLinea
            ? 'border-border bg-card'
            : 'border-dashed border-muted-foreground/50 bg-transparent',
        )}
      >
        <span
          className={cn(
            'block rounded-full',
            compacto ? 'size-2.5' : 'size-2',
            enLinea ? 'bg-paso-ok' : 'bg-muted-foreground/60',
          )}
        />
        {!compacto && (
          <span className="text-xs font-medium text-muted-foreground">
            {enLinea ? 'En línea' : 'Sin conexión'}
          </span>
        )}
      </div>

      {!compacto && (
        <div className="text-[11px] text-muted-foreground">
          {PROPOSITOS[dispositivo.proposito as NombreProposito] ?? dispositivo.proposito}
        </div>
      )}
    </div>
  );
}

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

  // Los de acceso no se accionan desde acá: sólo se informa si responden.
  if (muestraConexion(dispositivo.proposito)) {
    return <TestigoDeConexion dispositivo={dispositivo} compacto={compacto} />;
  }

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
