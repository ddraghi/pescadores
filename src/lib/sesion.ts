/**
 * Sesión: firma y verificación del token.
 *
 * Este archivo NO importa `next/headers` ni Prisma a propósito: lo usa el middleware,
 * que corre en el runtime Edge. Todo lo que necesite el servidor completo va en
 * `auth.ts`, que sí puede leer cookies y consultar la base.
 *
 * A diferencia de netgym —cuyo middleware sólo mira si la cookie EXISTE, porque no puede
 * verificar la firma en Edge— acá `jose` sí funciona en Edge, así que el perímetro
 * verifica la firma de verdad antes de dejar pasar.
 */

import { SignJWT, jwtVerify } from 'jose';
import type { Rol } from '@prisma/client';

export const COOKIE_SESION = 'sesion';

/** Catorce días: en las porterías no se vuelve a entrar todos los días. */
export const DURACION_SESION_SEG = 60 * 60 * 24 * 14;

export interface RolDeSesion {
  rol: Rol;
  /** Nulo en los roles de gobierno, que ven todo el club. */
  predioId: string | null;
}

export interface Sesion {
  personaId: string;
  nombre: string;
  /** Todos los roles de la persona. Alguien puede ser Tesorero y socio a la vez. */
  roles: RolDeSesion[];
  /** Con cuál está trabajando ahora. Determina el panel y lo que ve. */
  rolActivo: Rol;
}

function clave(): Uint8Array {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) {
    throw new Error('Falta AUTH_SECRET. Copiá el .env.example a .env y generá una clave.');
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(sesion: Sesion): Promise<string> {
  return await new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(clave());
}

/** Devuelve la sesión si el token es válido y no venció; null en cualquier otro caso. */
export async function verificarSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    const { personaId, nombre, roles, rolActivo } = payload as unknown as Sesion;
    if (!personaId || !rolActivo || !Array.isArray(roles)) return null;
    return { personaId, nombre, roles, rolActivo };
  } catch {
    // Firma inválida, token adulterado o vencido. Todos son lo mismo: no hay sesión.
    return null;
  }
}

/** Los predios que la persona tiene asignados en su rol activo. */
export function prediosDelRolActivo(sesion: Sesion): string[] {
  return sesion.roles
    .filter((r) => r.rol === sesion.rolActivo && r.predioId)
    .map((r) => r.predioId as string);
}
