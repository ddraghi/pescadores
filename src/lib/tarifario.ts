/**
 * Resolución de precios del tarifario.
 *
 * El tarifario del club cruza cuatro cosas: el concepto, el predio, la condición de la
 * persona y la fecha. La misma entrada vale distinto en El Nihuil que en Valle Grande, y
 * distinto para un socio, un no socio o un jubilado.
 *
 * Escrito como función pura sobre objetos planos para poder probarlo sin base de datos:
 * es la lógica que más caro sale equivocar, porque se equivoca en plata.
 */

/** Lo mínimo que necesita el resolvedor. Coincide con `ItemTarifario` de Prisma. */
export interface ItemPrecio {
  id: string;
  concepto: string;
  predioId: string | null;
  condicion: string;
  precio: number;
  vigenciaDesde: Date;
  vigenciaHasta: Date | null;
  categoriaSocio?: string | null;
  porGrupoFamiliar?: boolean;
}

export interface CriterioPrecio {
  concepto: string;
  /** Nulo busca sólo los precios que valen para todos los predios. */
  predioId?: string | null;
  condicion?: string;
  categoriaSocio?: string | null;
  porGrupoFamiliar?: boolean;
  fecha?: Date;
}

function vigente(item: ItemPrecio, fecha: Date): boolean {
  if (item.vigenciaDesde > fecha) return false;
  if (item.vigenciaHasta && item.vigenciaHasta < fecha) return false;
  return true;
}

/**
 * Elige el precio que corresponde, o null si no hay ninguno cargado.
 *
 * Que devuelva null NO es un error: es el club diciendo que ese concepto no se cobra en
 * ese caso. La cuota de los vitalicios funciona así — no se cargó precio, no se genera
 * cuota, y no hay ninguna regla escondida en el código decidiéndolo.
 *
 * Desempates, en orden:
 *   1. El precio del predio puntual le gana al precio general.
 *   2. Entre los que quedan, el de vigencia más reciente.
 */
export function resolverPrecio(items: ItemPrecio[], criterio: CriterioPrecio): ItemPrecio | null {
  const fecha = criterio.fecha ?? new Date();
  const condicion = criterio.condicion ?? 'SOCIO';

  const candidatos = items.filter((i) => {
    if (i.concepto !== criterio.concepto) return false;
    if (i.condicion !== condicion) return false;
    if (!vigente(i, fecha)) return false;

    // El predio puntual o el general; nunca el de OTRO predio.
    if (criterio.predioId !== undefined) {
      if (i.predioId !== null && i.predioId !== criterio.predioId) return false;
    }

    // La categoría sólo se compara cuando el criterio la menciona: los conceptos que no
    // son cuota social no la usan.
    if (criterio.categoriaSocio !== undefined) {
      if ((i.categoriaSocio ?? null) !== (criterio.categoriaSocio ?? null)) return false;
    }
    if (criterio.porGrupoFamiliar !== undefined) {
      if ((i.porGrupoFamiliar ?? false) !== criterio.porGrupoFamiliar) return false;
    }

    return true;
  });

  if (candidatos.length === 0) return null;

  candidatos.sort((a, b) => {
    const puntual = (x: ItemPrecio) => (x.predioId ? 0 : 1);
    if (puntual(a) !== puntual(b)) return puntual(a) - puntual(b);
    return b.vigenciaDesde.getTime() - a.vigenciaDesde.getTime();
  });

  return candidatos[0];
}

/** Concepto reservado de la cuota social: lo usa la generación mensual. */
export const CONCEPTO_CUOTA = 'Cuota social';

export const MEDIOS_PAGO = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  DEBITO_AUTOMATICO: 'Débito automático',
} as const;

export type NombreMedioPago = keyof typeof MEDIOS_PAGO;

export const CONDICIONES = {
  SOCIO: 'Socio',
  NO_SOCIO: 'No socio',
  JUBILADO: 'Jubilado o persona con discapacidad',
  DISCAPACIDAD: 'Persona con discapacidad',
  MENOR_5: 'Menor de 5 años',
  ACOMPANANTE: 'Acompañante de socio',
  INVITADO: 'Invitado',
} as const;

export type NombreCondicion = keyof typeof CONDICIONES;

export const ESTADOS_CUOTA = {
  PENDIENTE: 'Pendiente',
  PAGADA: 'Pagada',
  VENCIDA: 'Vencida',
  CONDONADA: 'Condonada',
} as const;

/** "2026-08" → "agosto de 2026". */
export function nombrePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${meses[mes - 1] ?? '?'} de ${anio}`;
}

/** El período de una fecha, en formato "AAAA-MM". */
export function periodoDe(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}
