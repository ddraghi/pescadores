'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FormularioIngreso() {
  const router = useRouter();
  const params = useSearchParams();
  const volver = params.get('volver');

  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave }),
      });
      const datos = await res.json();

      if (!res.ok) {
        setError(datos.error ?? 'No se pudo ingresar.');
        setEntrando(false);
        return;
      }

      // El destino lo decide el servidor según el rol. `volver` sólo se respeta si es
      // una ruta interna, para que nadie arme un enlace que redirija afuera.
      const destino = volver?.startsWith('/') && !volver.startsWith('//') ? volver : datos.ruta;
      router.replace(destino);
      router.refresh();
    } catch {
      setError('No se pudo conectar con el servidor. Revisá la conexión y volvé a intentar.');
      setEntrando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="usuario">Usuario</Label>
        <Input
          id="usuario"
          name="usuario"
          autoComplete="username"
          autoFocus
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          disabled={entrando}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clave">Contraseña</Label>
        <Input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          disabled={entrando}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-marca">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={entrando}>
        {entrando ? (
          <>
            <Loader2 className="animate-spin" />
            Ingresando…
          </>
        ) : (
          'Ingresar'
        )}
      </Button>
    </form>
  );
}
