'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, ErrorFormulario } from '@/components/ui/campos';
import {
  Dialogo,
  DisparadorDialogo,
  ContenidoDialogo,
  TituloDialogo,
  DescripcionDialogo,
} from '@/components/ui/dialogo';
import { importarPadron } from '@/lib/acciones/importacion';

/**
 * Importación del padrón. A diferencia del resto de los formularios, éste NO se cierra
 * al terminar: muestra el reporte de qué entró y qué no. Importar miles de socios y que
 * la pantalla se cierre sin decir nada sería la peor manera de enterarse de un problema.
 */
export function ImportarPadron() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState(importarPadron, null);

  const reporte = estado?.ok ? estado.reporte : null;

  return (
    <Dialogo
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v && reporte) router.refresh();
      }}
    >
      <DisparadorDialogo asChild>
        <Button variant="outline">
          <Upload />
          Importar padrón
        </Button>
      </DisparadorDialogo>

      <ContenidoDialogo className="max-w-xl">
        <div className="space-y-1">
          <TituloDialogo>Importar el padrón desde un CSV</TituloDialogo>
          <DescripcionDialogo>
            Hacen falta al menos una columna de nombre y una de DNI. El resto —número de socio,
            categoría, estado, fecha de ingreso, correo y teléfono— se toma si está.
          </DescripcionDialogo>
        </div>

        <form action={enviar} className="space-y-4">
          <Campo
            etiqueta="Archivo"
            htmlFor="archivo"
            ayuda="Los socios se identifican por DNI: si uno ya existe, se actualiza en vez de duplicarse."
          >
            <input
              id="archivo"
              name="archivo"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </Campo>

          {estado && !estado.ok && <ErrorFormulario mensaje={estado.error} />}

          <Button type="submit" disabled={pendiente} className="w-full">
            {pendiente && <Loader2 className="animate-spin" />}
            {pendiente ? 'Importando…' : 'Importar'}
          </Button>
        </form>

        {reporte && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Leídas', reporte.leidas],
                ['Nuevos', reporte.creados],
                ['Actualizados', reporte.actualizados],
                ['Rechazos', reporte.rechazos.length],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta as string} className="rounded-md border border-border p-2">
                  <div className="text-xl font-bold tabular-nums">{valor}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {etiqueta}
                  </div>
                </div>
              ))}
            </div>

            {reporte.rechazos.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-marca">
                  Filas que no entraron
                </p>
                <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-border">
                      {reporte.rechazos.map((r, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">
                            {r.fila}
                          </td>
                          <td className="px-2 py-1.5">{r.dato}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{r.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Corregí esas filas en el archivo y volvé a importarlo: lo que ya entró se
                  actualiza, no se duplica.
                </p>
              </div>
            )}
          </div>
        )}
      </ContenidoDialogo>
    </Dialogo>
  );
}
