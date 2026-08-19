import * as React from 'react';
import { cn } from '@/lib/utils';

/** Contenedor con scroll propio: la tabla nunca hace que la página se corra al costado. */
export function Tabla({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border bg-card', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Encabezados({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-border bg-secondary/50">
      <tr className="text-left">{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>;
}

export function Filas({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function Vacio({ columnas, children }: { columnas: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-4 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

/** Pastilla de estado. `tono` neutro para lo informativo, marca para lo activo. */
export function Pastilla({
  children,
  tono = 'neutro',
}: {
  children: React.ReactNode;
  tono?: 'neutro' | 'activo' | 'inactivo';
}) {
  const tonos = {
    neutro: 'border-border bg-secondary text-muted-foreground',
    activo: 'border-accent/40 bg-accent/10 text-marca',
    inactivo: 'border-border bg-transparent text-muted-foreground line-through',
  };
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tonos[tono],
      )}
    >
      {children}
    </span>
  );
}
