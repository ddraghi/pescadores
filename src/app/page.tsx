import Image from 'next/image';
import { ORDEN_ROLES, ROLES } from '@/lib/roles';

/**
 * Portada provisoria de la etapa 0. Sirve para verificar que el sistema visual, las
 * tipografías y la paleta del club están bien cargados. En la etapa 1 la reemplaza el
 * login, y esta ruta pasa a redirigir según el rol de la sesión.
 */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 p-6">
      <Image
        src="/logo-club.png"
        alt="Club de Pescadores San Rafael"
        width={437}
        height={84}
        priority
        className="dark:invert-0"
      />

      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Plataforma de <span className="text-marca">gestión del club</span>
        </h1>
        <p className="text-muted-foreground">
          Etapa 0 lista. El ingreso se habilita en la etapa siguiente.
        </p>
      </div>

      <section className="w-full max-w-2xl">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Roles previstos
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ORDEN_ROLES.map((rol) => (
            <li
              key={rol}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              {ROLES[rol].etiqueta}
              <span className="block font-mono text-[11px] text-muted-foreground">
                {ROLES[rol].ruta}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full max-w-2xl">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Carteles de acceso
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="cartel cartel-ok rounded-lg" style={{ minHeight: '9rem', fontSize: '1.75rem' }}>
            PASE
          </div>
          <div className="cartel cartel-alerta rounded-lg" style={{ minHeight: '9rem', fontSize: '1.75rem' }}>
            REGULARIZAR
          </div>
          <div className="cartel cartel-no rounded-lg" style={{ minHeight: '9rem', fontSize: '1.75rem' }}>
            NO PASA
          </div>
        </div>
      </section>
    </main>
  );
}
