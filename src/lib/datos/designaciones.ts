import 'server-only';
import { Rol } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { acotadoAPredio, designables, ROLES } from '@/lib/roles';
import type {
  PersonaEnLista,
  PredioOpcion,
  RolOpcion,
} from '@/components/panel/designaciones';

/**
 * Arma la pantalla de designaciones según QUIÉN está mirando.
 *
 * El Administrador ve y designa Secretario y Tesorero; el Secretario, al personal; el
 * Tesorero, a sus cobradores. Todo sale de `designables()`, así que la pantalla no
 * decide nada: refleja la matriz de `roles.ts`.
 *
 * Los socios quedan afuera a propósito aunque el Secretario pueda darlos de alta: son
 * miles y tienen su propia pantalla. Ésta es para el personal.
 */
export async function datosDesignaciones(rolActivo: Rol): Promise<{
  personas: PersonaEnLista[];
  roles: RolOpcion[];
  predios: PredioOpcion[];
}> {
  // Anotado como Rol[] a propósito: sin esto TypeScript excluye SOCIO del tipo por el
  // filtro, y después no deja preguntar si un rol cualquiera está en la lista.
  const puedeDesignarEstos: Rol[] = designables([rolActivo]).filter((r) => r !== Rol.SOCIO);

  const [registros, predios] = await Promise.all([
    puedeDesignarEstos.length
      ? prisma.persona.findMany({
          where: { roles: { some: { rol: { in: puedeDesignarEstos } } } },
          orderBy: { nombre: 'asc' },
          include: {
            roles: {
              include: { predio: { select: { nombre: true } } },
              orderBy: { creadoEn: 'asc' },
            },
          },
        })
      : Promise.resolve([]),
    prisma.predio.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true },
    }),
  ]);

  const personas: PersonaEnLista[] = registros.map((p) => {
    const roles = p.roles.map((r) => ({
      id: r.id,
      rol: r.rol,
      etiqueta: ROLES[r.rol].etiqueta,
      predioNombre: r.predio?.nombre ?? null,
      puedeQuitarlo: puedeDesignarEstos.includes(r.rol),
    }));

    return {
      id: p.id,
      nombre: p.nombre,
      dni: p.dni,
      usuario: p.usuario,
      activo: p.activo,
      roles,
      // Sólo se puede editar o dar de baja a alguien cuyos roles se puedan administrar
      // por completo. Si acumula uno que excede el alcance, queda fuera.
      administrable: roles.every((r) => r.puedeQuitarlo),
    };
  });

  const roles: RolOpcion[] = puedeDesignarEstos.map((r) => ({
    valor: r,
    etiqueta: ROLES[r].etiqueta,
    requierePredio: acotadoAPredio(r),
  }));

  return { personas, roles, predios };
}
