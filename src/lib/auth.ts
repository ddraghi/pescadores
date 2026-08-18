/**
 * Sesión del lado del servidor. Sólo para componentes de servidor y route handlers:
 * usa `next/headers`, que no existe en el runtime Edge del middleware.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_SESION, verificarSesion, type Sesion } from '@/lib/sesion';
import { puede, ROLES, type Capacidad } from '@/lib/roles';

export type { Sesion };

/** La sesión verificada, o null si no hay ninguna válida. */
export async function sesionActual(): Promise<Sesion | null> {
  const galletas = await cookies();
  return verificarSesion(galletas.get(COOKIE_SESION)?.value);
}

/** Exige sesión. Sin ella manda al login; no devuelve. */
export async function exigirSesion(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect('/login');
  return sesion;
}

/**
 * Exige que el rol activo habilite la capacidad. Si no, manda al panel que le
 * corresponde en vez de mostrar un error: la persona no se equivocó de contraseña,
 * se equivocó de puerta.
 */
export async function exigirCapacidad(capacidad: Capacidad): Promise<Sesion> {
  const sesion = await exigirSesion();
  if (!puede(sesion.rolActivo, capacidad)) {
    redirect(ROLES[sesion.rolActivo].ruta);
  }
  return sesion;
}

/** Igual que `exigirCapacidad` pero para route handlers: devuelve el error en vez de redirigir. */
export class ErrorAutorizacion extends Error {
  constructor(public estado: 401 | 403, mensaje: string) {
    super(mensaje);
  }
}

export async function exigirCapacidadApi(capacidad: Capacidad): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) throw new ErrorAutorizacion(401, 'No hay sesión iniciada');
  if (!puede(sesion.rolActivo, capacidad)) {
    throw new ErrorAutorizacion(403, 'Tu rol no habilita esta acción');
  }
  return sesion;
}
