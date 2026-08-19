import 'server-only';
import { Prisma, CategoriaSocio, EstadoSocio } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const POR_PAGINA = 25;

export interface FiltrosPadron {
  q?: string;
  categoria?: string;
  estado?: string;
  pagina?: number;
}

/** Un integrante del grupo, como se carga y se muestra dentro de la ficha del titular. */
export interface FamiliarEnFicha {
  id: string;
  numeroSocio: number;
  nombre: string;
  dni: string;
  fechaNacimiento: string | null;
  parentesco: string | null;
}

export interface SocioEnLista {
  id: string;
  numeroSocio: number;
  nombre: string;
  dni: string;
  categoria: string;
  estado: string;
  fechaIngreso: string;
  fechaNacimiento: string | null;
  permisoHasta: string | null;
  email: string | null;
  telefono: string | null;
  usuario: string | null;
  observaciones: string | null;
  /** Titular del grupo, si este socio cuelga de otro. */
  titularId: string | null;
  /**
   * Nombre del grupo familiar, que es el del titular. En el titular es su propio
   * nombre; en un socio suelto, nulo.
   */
  grupoFamiliar: string | null;
  esTitular: boolean;
  parentesco: string | null;
  /** Los que cuelgan de él. Vacío salvo en un titular. */
  familiares: FamiliarEnFicha[];
  antiguedad: number;
}

function aISO(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * Busca en el padrón con paginado. El padrón del club tiene miles de socios —los
 * números de la comisión directiva llegan a 14.965—, así que nunca se traen todos.
 */
export async function buscarSocios(filtros: FiltrosPadron) {
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const q = (filtros.q ?? '').trim();

  const condiciones: Prisma.SocioWhereInput[] = [];

  if (q) {
    const soloDigitos = q.replace(/\D/g, '');
    const alternativas: Prisma.SocioWhereInput[] = [
      { persona: { nombre: { contains: q, mode: 'insensitive' } } },
    ];
    if (soloDigitos) {
      alternativas.push({ persona: { dni: { startsWith: soloDigitos } } });
      const nro = Number(soloDigitos);
      if (Number.isSafeInteger(nro)) alternativas.push({ numeroSocio: nro });
    }
    condiciones.push({ OR: alternativas });
  }

  if (filtros.categoria && filtros.categoria in CategoriaSocio) {
    condiciones.push({ categoria: filtros.categoria as CategoriaSocio });
  }
  if (filtros.estado && filtros.estado in EstadoSocio) {
    condiciones.push({ estado: filtros.estado as EstadoSocio });
  }

  const where: Prisma.SocioWhereInput = condiciones.length ? { AND: condiciones } : {};

  const [total, registros] = await Promise.all([
    prisma.socio.count({ where }),
    prisma.socio.findMany({
      where,
      orderBy: { numeroSocio: 'asc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        persona: true,
        titular: { select: { persona: { select: { nombre: true } } } },
        familiares: {
          orderBy: { numeroSocio: "asc" },
          select: {
            id: true,
            numeroSocio: true,
            parentesco: true,
            persona: { select: { nombre: true, dni: true, fechaNacimiento: true } },
          },
        },
      },
    }),
  ]);

  const hoy = new Date();
  const socios: SocioEnLista[] = registros.map((s) => ({
    id: s.id,
    numeroSocio: s.numeroSocio,
    nombre: s.persona.nombre,
    dni: s.persona.dni,
    categoria: s.categoria,
    estado: s.estado,
    fechaIngreso: aISO(s.fechaIngreso)!,
    fechaNacimiento: aISO(s.persona.fechaNacimiento),
    permisoHasta: aISO(s.permisoHasta),
    email: s.persona.email,
    telefono: s.persona.telefono,
    usuario: s.persona.usuario,
    observaciones: s.observaciones,
    titularId: s.titularId,
    // El grupo se llama como su titular: si este socio es el titular, es su propio
    // nombre; si cuelga de otro, el del otro.
    grupoFamiliar: s.titular?.persona.nombre ?? (s.familiares.length > 0 ? s.persona.nombre : null),
    esTitular: s.familiares.length > 0,
    parentesco: s.parentesco,
    familiares: s.familiares.map((f) => ({
      id: f.id,
      numeroSocio: f.numeroSocio,
      nombre: f.persona.nombre,
      dni: f.persona.dni,
      fechaNacimiento: aISO(f.persona.fechaNacimiento),
      parentesco: f.parentesco,
    })),
    antiguedad: hoy.getFullYear() - s.fechaIngreso.getFullYear(),
  }));

  return {
    socios,
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}

/** Totales por estado, para el encabezado del padrón. */
export async function resumenPadron() {
  const porEstado = await prisma.socio.groupBy({ by: ['estado'], _count: true });
  const total = porEstado.reduce((suma, e) => suma + e._count, 0);
  return {
    total,
    porEstado: Object.fromEntries(porEstado.map((e) => [e.estado, e._count])) as Record<string, number>,
  };
}
