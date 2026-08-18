import { exigirSesion } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BarraLateral } from '@/components/panel/barra-lateral';
import { BotonTema } from '@/components/tema';
import { prediosDelRolActivo } from '@/lib/sesion';

/**
 * Armazón común de todos los paneles. El middleware ya verificó la firma del token;
 * acá se vuelve a exigir la sesión porque el perímetro no alcanza: cada página tiene
 * que poder confiar en lo que recibe.
 */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await exigirSesion();

  const ids = prediosDelRolActivo(sesion);
  const predios = ids.length
    ? (
        await prisma.predio.findMany({
          where: { id: { in: ids } },
          select: { nombre: true },
          orderBy: { orden: 'asc' },
        })
      ).map((p) => p.nombre)
    : [];

  // Los demás roles de la persona, sin repetir y sin el que ya está usando.
  const otrosRoles = [...new Set(sesion.roles.map((r) => r.rol))].filter(
    (r) => r !== sesion.rolActivo,
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <BarraLateral
        nombre={sesion.nombre}
        rolActivo={sesion.rolActivo}
        otrosRoles={otrosRoles}
        predios={predios}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center justify-end gap-2 border-b border-border bg-card px-6 py-2 md:flex">
          <BotonTema />
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
