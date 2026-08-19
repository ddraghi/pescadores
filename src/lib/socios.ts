/**
 * Categorías y estados del socio, según el estatuto del club.
 *
 * Texto plano y sin importar Prisma para poder usarlo también en el navegador. Las
 * reglas de acá salen del estatuto, no de nuestro criterio: cada una lleva su artículo.
 */

export const CATEGORIAS = {
  ACTIVO: 'Activo',
  CADETE: 'Cadete',
  VITALICIO: 'Vitalicio',
  TRANSEUNTE: 'Transeúnte',
  HONORARIO: 'Honorario',
  PRESIDENTE_HONORARIO: 'Presidente honorario',
} as const;

export type NombreCategoria = keyof typeof CATEGORIAS;

export const AYUDA_CATEGORIA: Record<NombreCategoria, string> = {
  ACTIVO: 'Mayor de 18, presentado por dos socios. Paga cuota de ingreso y cuota mensual (art. 14).',
  CADETE: 'Menor de 18, hijo de socio activo o vitalicio (art. 14 inc. d).',
  VITALICIO: 'Pagó de una vez treinta años de cuota, o cumplió treinta años ininterrumpidos como activo (art. 17).',
  TRANSEUNTE: 'Permiso a término. Los beneficios caducan solos al vencer, y no vota ni integra la comisión (art. 14 inc. e).',
  HONORARIO: 'Designado por la asamblea o por el cargo público que ocupa. Sin voz ni voto (arts. 12 y 21).',
  PRESIDENTE_HONORARIO: 'Presidente y vice de la Nación (art. 12 inc. a).',
};

export const ESTADOS = {
  AL_DIA: 'Al día',
  MOROSO: 'Moroso',
  EMPLAZADO: 'Emplazado',
  LICENCIA: 'En licencia',
  SUSPENDIDO: 'Suspendido',
  CESANTE: 'Cesante',
  EXPULSADO: 'Expulsado',
} as const;

export type NombreEstado = keyof typeof ESTADOS;

export const AYUDA_ESTADO: Record<NombreEstado, string> = {
  AL_DIA: 'Sin deuda. Entra a los predios con normalidad.',
  MOROSO: 'Debe cuotas, todavía sin llegar a las tres consecutivas.',
  EMPLAZADO: 'Tres cuotas consecutivas impagas. Tiene diez días para regularizar antes de la cesantía (art. 28).',
  LICENCIA: 'Eximido de la cuota. Para usar las instalaciones se lo trata COMO NO SOCIO: entra pagando (art. 25).',
  SUSPENDIDO: 'Sancionado por el Tribunal de Disciplina. No entra mientras dure la sanción.',
  CESANTE: 'Dado de baja por falta de pago. Puede reingresar pagando la deuda y la cuota de ingreso (art. 29).',
  EXPULSADO: 'Expulsado por el Tribunal. No puede volver a ser socio nunca (art. 29).',
};

/** Estados en los que el socio NO pasa como socio por una portería. */
export const ESTADOS_SIN_ACCESO: NombreEstado[] = [
  'EMPLAZADO',
  'SUSPENDIDO',
  'CESANTE',
  'EXPULSADO',
];

/**
 * El socio en licencia entra, pero pagando como no socio (art. 25). No está en la lista
 * de arriba porque no se le niega el paso: se le cobra distinto.
 */
export const ESTADOS_COMO_NO_SOCIO: NombreEstado[] = ['LICENCIA'];

/**
 * Qué cambios de estado se permiten.
 *
 * La regla dura es EXPULSADO: no sale de ahí. El art. 29 dice que el cesante puede
 * reingresar, pero que los expulsados no vuelven a ser admitidos nunca.
 */
export const TRANSICIONES: Record<NombreEstado, NombreEstado[]> = {
  AL_DIA: ['MOROSO', 'LICENCIA', 'SUSPENDIDO', 'EXPULSADO'],
  MOROSO: ['AL_DIA', 'EMPLAZADO', 'LICENCIA', 'SUSPENDIDO', 'EXPULSADO'],
  EMPLAZADO: ['AL_DIA', 'CESANTE', 'SUSPENDIDO', 'EXPULSADO'],
  LICENCIA: ['AL_DIA', 'MOROSO', 'EXPULSADO'],
  SUSPENDIDO: ['AL_DIA', 'MOROSO', 'CESANTE', 'EXPULSADO'],
  CESANTE: ['AL_DIA', 'EXPULSADO'],
  EXPULSADO: [],
};

export function puedeCambiarEstado(desde: NombreEstado, hasta: NombreEstado): boolean {
  return TRANSICIONES[desde].includes(hasta);
}

/** Años cumplidos desde el ingreso. Es lo que define el pase a vitalicio. */
export function antiguedadEnAnios(fechaIngreso: Date, hoy = new Date()): number {
  let anios = hoy.getFullYear() - fechaIngreso.getFullYear();
  const cumplioEsteAnio =
    hoy.getMonth() > fechaIngreso.getMonth() ||
    (hoy.getMonth() === fechaIngreso.getMonth() && hoy.getDate() >= fechaIngreso.getDate());
  if (!cumplioEsteAnio) anios -= 1;
  return Math.max(0, anios);
}

export function edad(fechaNacimiento: Date, hoy = new Date()): number {
  return antiguedadEnAnios(fechaNacimiento, hoy);
}

/** Treinta años ininterrumpidos como activo dan derecho a vitalicio (art. 17 inc. b). */
export const ANIOS_PARA_VITALICIO = 30;

/** A los 18 el cadete deja de serlo (art. 14 inc. d). */
export const EDAD_FIN_CADETE = 18;

/**
 * Días que dura la revisación médica.
 *
 * El tarifario del club la cobra cada quince días, así que ése es el plazo por defecto
 * del apto. El médico puede poner otro en cada caso.
 */
export const DIAS_APTO_POR_DEFECTO = 15;
