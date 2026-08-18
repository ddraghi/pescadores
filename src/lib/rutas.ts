/**
 * Ruta base del panel de cada rol.
 *
 * Vive aparte de `roles.ts` porque lo necesita el middleware, que corre en Edge y no
 * puede importar el cliente de Prisma. Las claves son los nombres del enum `Rol` como
 * texto plano, a propósito. `roles.ts` toma las rutas de acá: una sola definición.
 */

export const RUTA_POR_ROL = {
  ADMIN_GENERAL: '/admin',
  SECRETARIO: '/secretaria',
  TESORERO: '/tesoreria',
  COBRADOR: '/cobranza',
  JEFE_PREDIO: '/predio',
  PORTERO: '/porteria',
  CONTROL_PASO: '/control',
  MAESTRANZA: '/maestranza',
  PROFESOR: '/profesor',
  CONCESIONARIO: '/concesion',
  MEDICO: '/medico',
  SOCIO: '/socio',
} as const;

export type NombreRol = keyof typeof RUTA_POR_ROL;

/** Todas las rutas de panel, para que el middleware sepa qué tiene que proteger. */
export const RUTAS_PANEL = Object.values(RUTA_POR_ROL);

/** ¿A qué rol pertenece esta ruta? Devuelve null si no es una ruta de panel. */
export function rolDeLaRuta(pathname: string): NombreRol | null {
  const entrada = (Object.entries(RUTA_POR_ROL) as [NombreRol, string][]).find(
    ([, ruta]) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
  return entrada ? entrada[0] : null;
}
