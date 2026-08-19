import { Prisma } from '@prisma/client';
import { ErrorAutorizacion } from '@/lib/auth';

/**
 * Todas las acciones devuelven lo mismo: salió bien, o salió mal con un motivo que se
 * le puede mostrar a una persona. Nada de lanzar excepciones al formulario.
 */
export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { datos: T }))
  | { ok: false; error: string };

export const EXITO = { ok: true } as const;

export function fallo(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * Traduce los errores de Prisma y de autorización a un mensaje entendible.
 * Cualquier otra cosa se registra y sale como error genérico: no se filtran detalles
 * internos a la pantalla.
 */
export function traducirError(e: unknown, contexto: string): { ok: false; error: string } {
  if (e instanceof ErrorAutorizacion) return fallo(e.message);

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      const campos = (e.meta?.target as string[] | undefined)?.join(', ');
      return fallo(campos ? `Ya existe otro registro con ese ${campos}.` : 'Ese valor ya está en uso.');
    }
    if (e.code === 'P2003') {
      return fallo('No se puede: hay otros registros que dependen de éste.');
    }
    if (e.code === 'P2025') {
      return fallo('El registro no existe o fue eliminado.');
    }
  }

  console.error(`[${contexto}]`, e);
  return fallo('No se pudo completar la operación. Volvé a intentar.');
}

/**
 * Convierte un nombre en un identificador para la URL: "El Nihuil" → "el-nihuil".
 *
 * `\p{Diacritic}` en vez del rango U+0300–U+036F escrito a mano: hace exactamente lo
 * mismo, pero se lee, y no deja caracteres invisibles en el archivo.
 */
export function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lee un campo de texto del FormData, recortado. Devuelve '' si no vino. */
export function texto(datos: FormData, campo: string): string {
  const v = datos.get(campo);
  return typeof v === 'string' ? v.trim() : '';
}

export function numero(datos: FormData, campo: string, porDefecto: number | null = null): number | null {
  const v = texto(datos, campo);
  if (!v) return porDefecto;
  const n = Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

export function casilla(datos: FormData, campo: string): boolean {
  return datos.get(campo) === 'on' || datos.get(campo) === 'true';
}
