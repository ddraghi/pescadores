'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, Lock, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BotonTema } from '@/components/tema';
import { MENUS, disponible } from '@/lib/menus';
import { ROLES } from '@/lib/roles';
import type { Rol } from '@prisma/client';

interface Props {
  nombre: string;
  rolActivo: Rol;
  /** Los demás roles de la persona, para poder cambiar de vista. */
  otrosRoles: Rol[];
  /** Nombres de los predios asignados, cuando el rol es acotado. */
  predios: string[];
}

export function BarraLateral({ nombre, rolActivo, otrosRoles, predios }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const definicion = ROLES[rolActivo];
  const items = MENUS[rolActivo];

  async function salir() {
    setSaliendo(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  async function cambiarRol(rol: Rol) {
    const res = await fetch('/api/auth/rol', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol }),
    });
    if (res.ok) {
      const { ruta } = await res.json();
      router.replace(ruta);
      router.refresh();
    }
  }

  const contenido = (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link href={definicion.ruta} className="px-2 py-1" onClick={() => setAbierta(false)}>
        <Image
          src="/logo-club.png"
          alt="Club de Pescadores San Rafael"
          width={200}
          height={38}
          priority
          className="h-8 w-auto"
        />
      </Link>

      {/* Quién soy y con qué rol estoy trabajando */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="truncate text-sm font-semibold">{nombre}</p>
        <p className="text-[11px] uppercase tracking-widest text-marca">{definicion.etiqueta}</p>
        {predios.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground" title={predios.join(', ')}>
            {predios.join(' · ')}
          </p>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => {
          const activo = pathname === item.href;
          const listo = disponible(item);
          const Icono = item.icono;

          if (!listo) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                title={`Se habilita en la etapa ${item.etapa}`}
              >
                <Icono className="size-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.etiqueta}</span>
                <Lock className="size-3 shrink-0" />
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAbierta(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                activo
                  ? 'bg-secondary font-semibold text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icono className="size-[18px] shrink-0" />
              <span className="truncate">{item.etiqueta}</span>
            </Link>
          );
        })}
      </nav>

      {otrosRoles.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-1 px-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Cambiar de rol
          </p>
          {otrosRoles.map((rol) => (
            <button
              key={rol}
              onClick={() => cambiarRol(rol)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeftRight className="size-[18px] shrink-0" />
              <span className="truncate">{ROLES[rol].etiqueta}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={salir}
        disabled={saliendo}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-marca disabled:opacity-50"
      >
        <LogOut className="size-[18px] shrink-0" />
        {saliendo ? 'Saliendo…' : 'Salir'}
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior en pantallas chicas */}
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-2 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setAbierta(true)} aria-label="Abrir menú">
          <Menu />
        </Button>
        <span className="flex-1 truncate text-sm font-semibold">{definicion.etiqueta}</span>
        <BotonTema />
      </header>

      {abierta && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAbierta(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-background shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => setAbierta(false)}
              aria-label="Cerrar menú"
            >
              <X />
            </Button>
            {contenido}
          </aside>
        </div>
      )}

      <aside className="hidden w-64 shrink-0 border-r border-border bg-background md:block">
        <div className="sticky top-0 h-screen">{contenido}</div>
      </aside>
    </>
  );
}
