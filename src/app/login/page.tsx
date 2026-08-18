import { Suspense } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import { FormularioIngreso } from './formulario';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BotonTema } from '@/components/tema';

export const metadata: Metadata = {
  title: 'Ingresar · Club de Pescadores San Rafael',
};

/**
 * Una sola pantalla de ingreso para los once roles. No se elige el rol ni el predio:
 * el servidor los resuelve a partir de la credencial y redirige al panel que toca.
 */
export default function PaginaIngreso() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <div className="absolute right-4 top-4">
        <BotonTema />
      </div>

      <Image
        src="/logo-club.png"
        alt="Club de Pescadores San Rafael"
        width={340}
        height={65}
        priority
      />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold">Ingresar</h1>
          <p className="text-sm text-muted-foreground">
            Con tu usuario y contraseña del club.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-56" />}>
            <FormularioIngreso />
          </Suspense>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ¿Problemas para entrar? Comunicate con Secretaría.
      </p>
    </main>
  );
}
