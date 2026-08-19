/**
 * Lectura del CSV del padrón: reconocimiento de columnas y conversión de valores.
 *
 * Vive aparte de la acción de importación para poder probarlo sin base de datos. Es la
 * parte que más se va a tocar cuando aparezca el archivo real del sistema actual.
 */

import { CategoriaSocio, EstadoSocio } from '@prisma/client';

/** Palabras de enlace que las planillas meten en los títulos y no aportan nada. */
const ENLACES = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y']);

/**
 * Sin tildes, sin signos, en minúsculas y sin palabras de enlace.
 *
 * Lo de las palabras de enlace no es adorno: «Fecha de Ingreso» y «Fecha Ingreso» tienen
 * que dar lo mismo, o la columna no se reconoce. Lo detectó `npm run probar:csv`.
 */
export function normalizar(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p && !ENLACES.has(p))
    .join('');
}

/** Variantes de encabezado aceptadas para cada campo. */
export const COLUMNAS: Record<string, string[]> = {
  numeroSocio: ['numerosocio', 'numero', 'nrosocio', 'nro', 'nsocio', 'socio', 'legajo', 'ndesocio'],
  nombre: ['nombre', 'apellidoynombre', 'nombreyapellido', 'apellidonombre', 'nombrecompleto', 'apellidoynombres'],
  dni: ['dni', 'documento', 'nrodocumento', 'numerodocumento'],
  categoria: ['categoria', 'tipo', 'tiposocio', 'categoriasocio'],
  estado: ['estado', 'situacion'],
  fechaIngreso: ['fechaingreso', 'ingreso', 'alta', 'fechaalta', 'antiguedad'],
  fechaNacimiento: ['fechanacimiento', 'nacimiento', 'fechanac', 'fnac'],
  email: ['email', 'correo', 'mail', 'correoelectronico'],
  telefono: ['telefono', 'tel', 'celular', 'movil', 'telefonos'],
};

export function mapearEncabezados(campos: string[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const [destino, variantes] of Object.entries(COLUMNAS)) {
    const encontrada = campos.find((c) => variantes.includes(normalizar(c)));
    if (encontrada) mapa[destino] = encontrada;
  }
  return mapa;
}

/**
 * Acepta 31/12/2024, 31-12-2024 y 2024-12-31.
 *
 * El formato local va primero en la ambigüedad porque en Argentina 03/04/2024 es el 3
 * de abril, no el 4 de marzo. Lo separa la posición del año.
 */
export function aFecha(valor: string): Date | null {
  const v = (valor ?? '').trim();
  if (!v) return null;

  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const local = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (local) {
    const dia = Number(local[1]);
    const mes = Number(local[2]);
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
    const anio = Number(local[3]) < 100 ? 1900 + Number(local[3]) : Number(local[3]);
    const d = new Date(anio, mes - 1, dia);
    // Rebota las fechas imposibles: 31/02 se convertiría en el 2 o 3 de marzo.
    if (d.getDate() !== dia || d.getMonth() !== mes - 1) return null;
    return d;
  }
  return null;
}

export function aCategoria(valor: string): CategoriaSocio | null {
  const v = normalizar(valor ?? '');
  if (!v) return CategoriaSocio.ACTIVO;
  if (v.startsWith('activ')) return CategoriaSocio.ACTIVO;
  if (v.startsWith('cadet')) return CategoriaSocio.CADETE;
  if (v.startsWith('vitalic')) return CategoriaSocio.VITALICIO;
  if (v.startsWith('transe')) return CategoriaSocio.TRANSEUNTE;
  if (v.startsWith('presidentehonorar')) return CategoriaSocio.PRESIDENTE_HONORARIO;
  if (v.startsWith('honorar')) return CategoriaSocio.HONORARIO;
  return null;
}

export function aEstado(valor: string): EstadoSocio | null {
  const v = normalizar(valor ?? '');
  if (!v) return EstadoSocio.AL_DIA;
  if (v.includes('aldia') || v.includes('activo') || v.includes('normal')) return EstadoSocio.AL_DIA;
  if (v.includes('moros') || v.includes('deud')) return EstadoSocio.MOROSO;
  if (v.includes('emplaz')) return EstadoSocio.EMPLAZADO;
  if (v.includes('licenc')) return EstadoSocio.LICENCIA;
  if (v.includes('suspend')) return EstadoSocio.SUSPENDIDO;
  if (v.includes('cesant') || v.includes('baja')) return EstadoSocio.CESANTE;
  if (v.includes('expuls')) return EstadoSocio.EXPULSADO;
  return null;
}
