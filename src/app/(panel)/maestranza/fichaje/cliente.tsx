'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Selector } from '@/components/ui/campos';
import { ficharse } from '@/lib/acciones/barrio';

/** Un solo botón grande: si estás adentro cierra, si estás afuera abre. */
export function FichajeCliente({
  predios,
  abierto,
}: {
  predios: { id: string; nombre: string }[];
  abierto: { predio: string; desde: string } | null;
}) {
  const router = useRouter();
  const [predioId, setPredioId] = useState(predios[0]?.id ?? '');
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function marcar() {
    setError(null);
    iniciar(async () => {
      const r = await ficharse(predioId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      {abierto ? (
        <p className="text-sm">
          Estás fichado en <strong>{abierto.predio}</strong> desde las {abierto.desde}.
        </p>
      ) : (
        <Campo etiqueta="Predio" htmlFor="predio">
          <Selector id="predio" value={predioId} onChange={(e) => setPredioId(e.target.value)}>
            {predios.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Selector>
        </Campo>
      )}

      {error && <p role="alert" className="text-sm text-marca">{error}</p>}

      <Button size="lg" className="h-16 text-lg" onClick={marcar} disabled={pendiente || (!abierto && !predioId)}>
        {pendiente ? <Loader2 className="animate-spin" /> : abierto ? <LogOut /> : <LogIn />}
        {abierto ? 'Marcar salida' : 'Marcar entrada'}
      </Button>
    </div>
  );
}
