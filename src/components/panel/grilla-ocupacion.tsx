import { cn } from '@/lib/utils';

export interface FilaOcupacion {
  id: string;
  nombre: string;
  predio: string;
  tomados: number[];
}

/**
 * Grilla de ocupación: una fila por recurso, una columna por día.
 *
 * Deliberadamente simple —un cuadradito lleno o vacío— porque lo que el jefe de predio
 * necesita ver de un vistazo es dónde hay lugar, no el detalle de cada reserva. El
 * detalle está en la pantalla de reservas.
 */
export function GrillaOcupacion({
  desde,
  dias,
  filas,
  vacio,
}: {
  desde: Date;
  dias: number;
  filas: FilaOcupacion[];
  vacio: string;
}) {
  const fechas = Array.from({ length: dias }, (_, i) => {
    const d = new Date(desde);
    d.setDate(d.getDate() + i);
    return d;
  });

  if (filas.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        {vacio}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="sticky left-0 z-10 bg-secondary/50 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recurso
            </th>
            {fechas.map((f, i) => {
              const finde = f.getDay() === 0 || f.getDay() === 6;
              return (
                <th
                  key={i}
                  className={cn(
                    'px-1 py-2 text-center text-[10px] font-medium',
                    finde ? 'text-marca' : 'text-muted-foreground',
                  )}
                >
                  <div>{f.toLocaleDateString('es-AR', { weekday: 'narrow' })}</div>
                  <div className="tabular-nums">{f.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((r) => (
            <tr key={r.id}>
              <td className="sticky left-0 z-10 bg-card px-4 py-2">
                <div className="whitespace-nowrap font-medium">{r.nombre}</div>
                <div className="text-[11px] text-muted-foreground">{r.predio}</div>
              </td>
              {fechas.map((_, i) => (
                <td key={i} className="px-1 py-2">
                  <div
                    className={cn(
                      'mx-auto h-6 w-6 rounded',
                      r.tomados.includes(i)
                        ? 'bg-accent/80'
                        : 'border border-dashed border-border bg-transparent',
                    )}
                    title={r.tomados.includes(i) ? 'Tomado' : 'Libre'}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
