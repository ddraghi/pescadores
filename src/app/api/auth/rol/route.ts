/**
 * Cambio de rol activo, para quien acumula más de uno — el Tesorero que además es socio,
 * o el Jefe de predio que a veces atiende la portería.
 *
 * Sólo se puede cambiar a un rol que la persona YA tenga en su sesión: no es una vía
 * para conseguir permisos, es un cambio de vista.
 */

import { NextResponse } from 'next/server';
import { sesionActual } from '@/lib/auth';
import { firmarSesion, COOKIE_SESION, DURACION_SESION_SEG } from '@/lib/sesion';
import { ROLES } from '@/lib/roles';
import type { Rol } from '@prisma/client';

export async function POST(req: Request) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: 'No hay sesión iniciada.' }, { status: 401 });
  }

  let cuerpo: { rol?: Rol };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Pedido mal formado.' }, { status: 400 });
  }

  const destino = cuerpo.rol;
  if (!destino || !sesion.roles.some((r) => r.rol === destino)) {
    return NextResponse.json({ error: 'No tenés ese rol asignado.' }, { status: 403 });
  }

  const respuesta = NextResponse.json({ ruta: ROLES[destino].ruta });
  respuesta.cookies.set(COOKIE_SESION, await firmarSesion({ ...sesion, rolActivo: destino }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACION_SESION_SEG,
  });
  return respuesta;
}
