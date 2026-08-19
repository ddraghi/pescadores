'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/**
 * Controles de formulario para las pantallas de administración.
 *
 * El desplegable y la casilla usan los elementos nativos del navegador en vez de los
 * de Radix: son bastante menos código, se comportan mejor con el teclado, y sobre todo
 * responden mejor al dedo en las pantallas táctiles de las porterías, que es donde más
 * se van a usar.
 */

export function Campo({
  etiqueta,
  htmlFor,
  ayuda,
  children,
  className,
}: {
  etiqueta: string;
  htmlFor?: string;
  ayuda?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{etiqueta}</Label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

export const Selector = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Selector.displayName = 'Selector';

export function Casilla({
  etiqueta,
  ayuda,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  const id = React.useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-[hsl(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        {...props}
      />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {etiqueta}
        </Label>
        {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
      </div>
    </div>
  );
}

/** Cartel de error de un formulario. */
export function ErrorFormulario({ mensaje }: { mensaje?: string | null }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-marca">
      {mensaje}
    </p>
  );
}
