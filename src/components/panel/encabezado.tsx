import * as React from 'react';

/** Encabezado común de las pantallas de administración: título, explicación y acción. */
export function EncabezadoPantalla({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
