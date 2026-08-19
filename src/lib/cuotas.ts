/**
 * Quién paga cuota, cuánto y por qué.
 *
 * Separado de la acción que la guarda para poder probarlo sin base de datos: es la
 * lógica que decide a quién se le cobra, y equivocarse ahí sale caro en las dos
 * direcciones —cobrarle a quien no debe, o no cobrarle a quien sí—.
 */

import { CONCEPTO_CUOTA, resolverPrecio, type ItemPrecio } from '@/lib/tarifario';

/** Lo mínimo que hace falta saber de un socio para decidir su cuota. */
export interface SocioParaCuota {
  id: string;
  categoria: string;
  estado: string;
  grupoFamiliarId: string | null;
  esTitular: boolean;
}

export interface CuotaCalculada {
  socioId: string;
  monto: number;
  concepto: string;
}

export interface MotivoExclusion {
  socioId: string;
  motivo: 'eximido' | 'lo_paga_el_titular' | 'sin_precio';
}

/**
 * Estados eximidos de la cuota.
 *
 * La licencia sale del art. 25: el socio queda eximido mientras dure. Los cesantes y
 * expulsados ya no son socios, así que tampoco.
 */
export const ESTADOS_EXIMIDOS = ['LICENCIA', 'CESANTE', 'EXPULSADO'];

/**
 * Calcula las cuotas de un período.
 *
 * Tres motivos para que a alguien no se le genere nada, y los tres son deliberados:
 *   - está eximido por su estado;
 *   - integra un grupo familiar sin ser el titular, y paga el titular por todos;
 *   - su categoría no tiene precio cargado en el tarifario. Así es como el club define
 *     que los vitalicios no pagan: no cargando el precio, no con un `if` acá adentro.
 */
export function calcularCuotasDelPeriodo(
  socios: SocioParaCuota[],
  items: ItemPrecio[],
  opciones: { primerDiaDelPeriodo: Date },
): { cuotas: CuotaCalculada[]; excluidos: MotivoExclusion[] } {
  const cuotas: CuotaCalculada[] = [];
  const excluidos: MotivoExclusion[] = [];

  for (const s of socios) {
    if (ESTADOS_EXIMIDOS.includes(s.estado)) {
      excluidos.push({ socioId: s.id, motivo: 'eximido' });
      continue;
    }

    const enGrupo = Boolean(s.grupoFamiliarId);
    if (enGrupo && !s.esTitular) {
      excluidos.push({ socioId: s.id, motivo: 'lo_paga_el_titular' });
      continue;
    }

    const item = resolverPrecio(items, {
      concepto: CONCEPTO_CUOTA,
      predioId: null,
      condicion: 'SOCIO',
      categoriaSocio: s.categoria,
      porGrupoFamiliar: enGrupo,
      fecha: opciones.primerDiaDelPeriodo,
    });

    if (!item) {
      excluidos.push({ socioId: s.id, motivo: 'sin_precio' });
      continue;
    }

    cuotas.push({
      socioId: s.id,
      monto: item.precio,
      concepto: enGrupo ? `${CONCEPTO_CUOTA} · Grupo familiar` : `${CONCEPTO_CUOTA} · ${s.categoria}`,
    });
  }

  return { cuotas, excluidos };
}
