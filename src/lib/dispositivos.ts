/**
 * Reglas de los dispositivos. Texto plano, sin Prisma, para usar también en el navegador.
 */

export const PROPOSITOS = {
  ACCESO: 'Acceso',
  ILUMINACION: 'Iluminación',
  BOMBA: 'Bomba',
  RIEGO: 'Riego',
  OTRO: 'Otro',
} as const;

export type NombreProposito = keyof typeof PROPOSITOS;

/**
 * Los que pueden hacer daño si se accionan por error vienen con confirmación puesta.
 * Es un valor por defecto, no una regla: el jefe de predio sabe cuáles son delicados.
 */
export const CONFIRMA_POR_DEFECTO: NombreProposito[] = ['BOMBA', 'RIEGO'];

export const VIAS = {
  relay_usb: 'Relay USB, conectado a la PC del puesto',
  sonoff_lan: 'Sonoff por la red local',
  sonoff_cloud: 'Sonoff por la nube de eWeLink',
} as const;

export type NombreVia = keyof typeof VIAS;

/** Las que no salen a internet para dar la orden. */
export const VIAS_LOCALES: NombreVia[] = ['relay_usb', 'sonoff_lan'];

export type EstadoVisible = 'ENCENDIDO' | 'APAGADO' | 'SIN_DATO';

/**
 * Cuántos segundos vale una lectura antes de considerarse vieja.
 *
 * Pasado ese plazo el testigo se pone gris y deja de poder tocarse. No es una
 * exageración: con una bomba, mostrar «apagado» cuando en realidad está andando lleva a
 * que alguien la apriete creyendo que la enciende, y la apague.
 */
export const FRESCURA_SEGUNDOS = 120;

/**
 * Qué mostrar en el testigo.
 *
 * Devuelve SIN_DATO cuando nunca se supo el estado o cuando la última lectura ya está
 * vieja. En modo simulado —desarrollo, sin aparatos— la lectura no envejece.
 */
export function estadoVisible(
  estado: string,
  estadoEn: Date | null,
  opciones: { ahora?: Date; simulado?: boolean } = {},
): EstadoVisible {
  if (estado !== 'ENCENDIDO' && estado !== 'APAGADO') return 'SIN_DATO';
  if (opciones.simulado) return estado;
  if (!estadoEn) return 'SIN_DATO';

  const ahora = opciones.ahora ?? new Date();
  const antiguedad = (ahora.getTime() - estadoEn.getTime()) / 1000;
  return antiguedad <= FRESCURA_SEGUNDOS ? estado : 'SIN_DATO';
}

/**
 * ¿Se puede usar esta vía en este predio?
 *
 * En los predios satelitales la orden no puede salir por la nube: la PC y el
 * interruptor están detrás del mismo Starlink, así que el pedido sube y baja por
 * satélite dos veces. Uno a tres segundos para abrir una barrera.
 */
export function viaPermitida(via: string, predioSatelital: boolean): boolean {
  if (!predioSatelital) return true;
  return VIAS_LOCALES.includes(via as NombreVia);
}

export const DIAS_SEMANA = [
  { valor: 1, corto: 'Lu', largo: 'lunes' },
  { valor: 2, corto: 'Ma', largo: 'martes' },
  { valor: 3, corto: 'Mi', largo: 'miércoles' },
  { valor: 4, corto: 'Ju', largo: 'jueves' },
  { valor: 5, corto: 'Vi', largo: 'viernes' },
  { valor: 6, corto: 'Sá', largo: 'sábado' },
  { valor: 7, corto: 'Do', largo: 'domingo' },
];

/** "Lu, Mi y Vi" o "todos los días". */
export function nombrarDias(dias: number[]): string {
  if (dias.length === 0 || dias.length === 7) return 'todos los días';
  const nombres = DIAS_SEMANA.filter((d) => dias.includes(d.valor)).map((d) => d.corto);
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
