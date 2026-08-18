import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLES, type Rol } from '@/lib/roles';
import { MENUS, disponible, ETAPA_ACTUAL } from '@/lib/menus';

const ALCANCE: Record<string, string> = {
  club: 'Ve y administra todo el club.',
  predio: 'Ve y administra únicamente los predios que tenga asignados.',
  propio: 'Ve únicamente lo suyo.',
};

/**
 * Panel de arranque de cada rol, mientras las secciones se van construyendo.
 *
 * No es un cartel de «en construcción»: muestra qué habilita el rol y qué secciones va
 * a tener, con la etapa en que llega cada una. Sirve para verificar de un vistazo que
 * la matriz de permisos quedó como se acordó.
 */
export function PanelInicial({ rol }: { rol: Rol }) {
  const definicion = ROLES[rol];
  const items = MENUS[rol];
  const pendientes = items.filter((i) => !disponible(i));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {definicion.etiqueta}
        </h1>
        <p className="mt-1 text-muted-foreground">{ALCANCE[definicion.alcance]}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Qué habilita este rol</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {definicion.puede.map((cap) => (
            <span
              key={cap}
              className="rounded-full border border-border bg-secondary px-3 py-1 font-mono text-xs"
            >
              {cap.replace(/_/g, ' ')}
            </span>
          ))}
        </CardContent>
      </Card>

      {definicion.designa.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Puede designar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {definicion.designa.map((r) => (
              <span
                key={r}
                className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-marca"
              >
                {ROLES[r].etiqueta}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Secciones por construir</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {pendientes.map((item) => (
                <li key={item.href} className="flex items-center gap-3 py-2 text-sm">
                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{item.etiqueta}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    etapa {item.etapa}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Construido hasta la etapa {ETAPA_ACTUAL}. Ver <code>PLAN.md</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
