'use client';

import * as React from 'react';
import { ThemeProvider as SiguienteTema, useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProveedorTema({ children }: { children: React.ReactNode }) {
  return (
    <SiguienteTema attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </SiguienteTema>
  );
}

export function BotonTema() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = React.useState(false);

  // El tema real recién se conoce en el navegador; hasta entonces se dibuja el hueco
  // para no cambiar la altura de la barra cuando aparece.
  React.useEffect(() => setMontado(true), []);
  if (!montado) return <div className="h-10 w-10" aria-hidden />;

  const oscuro = resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(oscuro ? 'light' : 'dark')}
      title={oscuro ? 'Pasar a tema claro' : 'Pasar a tema oscuro'}
    >
      {oscuro ? <Sun /> : <Moon />}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
