import 'server-only';
import { TipoHabilitacion } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Concepto del tarifario que manda a alguien a la cola de enfermería. */
export const CONCEPTO_REVISACION = 'Revisación de enfermería';

export interface EnEspera {
  socioId: string;
  numeroSocio: number;
  nombre: string;
  pagadoEn: string;
  predio: string;
  /** Vencimiento del apto anterior, si tenía. */
  aptoAnteriorHasta: string | null;
}

interface LineaCobro {
  concepto?: string;
}

/**
 * Quiénes pagaron la revisación y todavía no fueron revisados.
 *
 * El detalle del cobro es un JSON, así que el filtro se hace en memoria sobre los
 * últimos treinta días. Con el volumen de un club es despreciable, y evita depender de
 * consultas sobre JSON que después nadie entiende.
 */
export async function colaDeEnfermeria(): Promise<EnEspera[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - 30);

  const cobros = await prisma.cobro.findMany({
    where: { ocurridoEn: { gte: desde }, socioId: { not: null } },
    orderBy: { ocurridoEn: 'asc' },
    include: {
      predio: { select: { nombre: true } },
      socio: {
        include: {
          persona: { select: { nombre: true } },
          habilitaciones: {
            where: { tipo: TipoHabilitacion.APTO_MEDICO },
            orderBy: { creadoEn: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  const enEspera = new Map<string, EnEspera>();

  for (const c of cobros) {
    const lineas = (Array.isArray(c.items) ? c.items : []) as LineaCobro[];
    if (!lineas.some((l) => l.concepto === CONCEPTO_REVISACION)) continue;
    if (!c.socio) continue;

    const ultimo = c.socio.habilitaciones[0];
    // Ya lo revisaron DESPUÉS de este pago: sale de la cola.
    if (ultimo && ultimo.creadoEn >= c.ocurridoEn) continue;

    enEspera.set(c.socio.id, {
      socioId: c.socio.id,
      numeroSocio: c.socio.numeroSocio,
      nombre: c.socio.persona.nombre,
      pagadoEn: c.ocurridoEn.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      predio: c.predio.nombre,
      aptoAnteriorHasta: ultimo?.hasta.toISOString().slice(0, 10) ?? null,
    });
  }

  return [...enEspera.values()];
}

export async function historialDeAptos(limite = 60) {
  return prisma.habilitacion.findMany({
    where: { tipo: TipoHabilitacion.APTO_MEDICO },
    orderBy: { creadoEn: 'desc' },
    take: limite,
    include: {
      socio: { include: { persona: { select: { nombre: true } } } },
      emisor: { select: { nombre: true } },
    },
  });
}

/** Aptos vigentes que vencen dentro de los próximos días. */
export async function aptosPorVencer(dias = 7) {
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);

  return prisma.habilitacion.findMany({
    where: {
      tipo: TipoHabilitacion.APTO_MEDICO,
      autorizado: true,
      hasta: { gte: hoy, lte: limite },
    },
    orderBy: { hasta: 'asc' },
    include: { socio: { include: { persona: { select: { nombre: true } } } } },
  });
}
