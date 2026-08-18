/**
 * Perímetro del panel. Corre en Edge, antes que cualquier página.
 *
 * Acá se verifica la FIRMA del token, no sólo que la cookie exista: `jose` funciona en
 * Edge, así que no hace falta el chequeo débil que usa netgym. Un token adulterado o
 * vencido no pasa de este archivo.
 *
 * Esto es el perímetro, no el control de acceso a los datos. Cada página vuelve a exigir
 * su capacidad con `exigirCapacidad()`, y las consultas filtran por el alcance del rol.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_SESION, verificarSesion } from '@/lib/sesion';
import { RUTA_POR_ROL, rolDeLaRuta } from '@/lib/rutas';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await verificarSesion(req.cookies.get(COOKIE_SESION)?.value);

  // Ya tiene sesión y va al login: mandarlo a su panel en vez de pedirle que entre de nuevo.
  if (pathname === '/login') {
    if (sesion) {
      return NextResponse.redirect(new URL(RUTA_POR_ROL[sesion.rolActivo], req.url));
    }
    return NextResponse.next();
  }

  const rolDueño = rolDeLaRuta(pathname);
  if (!rolDueño) return NextResponse.next();

  // Ruta de panel sin sesión válida: al login, recordando a dónde quería ir.
  if (!sesion) {
    const url = new URL('/login', req.url);
    url.searchParams.set('volver', pathname);
    return NextResponse.redirect(url);
  }

  // Entró al panel de otro rol. Si lo tiene entre los suyos no es un intento de colarse,
  // es que quiso cambiar de vista: se lo deja pasar cambiándole el rol activo abajo.
  // Si no lo tiene, vuelve a lo suyo.
  if (rolDueño !== sesion.rolActivo) {
    const loTiene = sesion.roles.some((r) => r.rol === rolDueño);
    if (!loTiene) {
      return NextResponse.redirect(new URL(RUTA_POR_ROL[sesion.rolActivo], req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/admin/:path*',
    '/secretaria/:path*',
    '/tesoreria/:path*',
    '/cobranza/:path*',
    '/predio/:path*',
    '/porteria/:path*',
    '/control/:path*',
    '/maestranza/:path*',
    '/profesor/:path*',
    '/concesion/:path*',
    '/medico/:path*',
    '/socio/:path*',
  ],
};
