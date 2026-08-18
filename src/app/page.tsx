import { redirect } from 'next/navigation';
import { sesionActual } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

/**
 * La raíz no muestra nada propio: manda a cada uno donde corresponde. Cuando el club
 * enlace la plataforma desde su web, ése es el enlace que va a usar el botón.
 */
export default async function Inicio() {
  const sesion = await sesionActual();
  redirect(sesion ? ROLES[sesion.rolActivo].ruta : '/login');
}
