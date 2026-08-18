/**
 * Ingreso. Una sola pantalla para los once roles: el sistema resuelve cuál es.
 *
 * Las credenciales se verifican SIEMPRE en el servidor. El navegador nunca recibe el
 * hash ni la lista de personas — que es la fuga que arrastraba netgym en su primera
 * versión, cuando comparaba contraseñas del lado del cliente.
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { firmarSesion, COOKIE_SESION, DURACION_SESION_SEG, type Sesion } from '@/lib/sesion';
import { ORDEN_ROLES, ROLES } from '@/lib/roles';

/** Mismo texto para usuario inexistente y contraseña incorrecta: no delata cuál falló. */
const CREDENCIAL_INVALIDA = 'Usuario o contraseña incorrectos.';

export async function POST(req: Request) {
  let cuerpo: { usuario?: string; clave?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Pedido mal formado.' }, { status: 400 });
  }

  const usuario = (cuerpo.usuario ?? '').trim().toLowerCase();
  const clave = cuerpo.clave ?? '';
  if (!usuario || !clave) {
    return NextResponse.json({ error: 'Completá usuario y contraseña.' }, { status: 400 });
  }

  const persona = await prisma.persona.findUnique({
    where: { usuario },
    include: { roles: { select: { rol: true, predioId: true } } },
  });

  // Se compara igual contra un hash falso cuando la persona no existe, para que el
  // tiempo de respuesta no revele si el usuario está o no en la base.
  const hash = persona?.passwordHash ?? '$2a$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalid';
  const coincide = await bcrypt.compare(clave, hash);

  if (!persona || !coincide) {
    return NextResponse.json({ error: CREDENCIAL_INVALIDA }, { status: 401 });
  }
  if (!persona.activo) {
    return NextResponse.json(
      { error: 'Tu cuenta está dada de baja. Comunicate con Secretaría.' },
      { status: 403 },
    );
  }
  if (persona.roles.length === 0) {
    return NextResponse.json(
      { error: 'Tu cuenta todavía no tiene un rol asignado. Comunicate con Secretaría.' },
      { status: 403 },
    );
  }

  // Con varios roles gana el de mayor gobierno; después puede cambiar de vista.
  const rolActivo = ORDEN_ROLES.find((r) => persona.roles.some((x) => x.rol === r))!;

  const sesion: Sesion = {
    personaId: persona.id,
    nombre: persona.nombre,
    roles: persona.roles.map((r) => ({ rol: r.rol, predioId: r.predioId })),
    rolActivo,
  };

  const respuesta = NextResponse.json({ ruta: ROLES[rolActivo].ruta });
  respuesta.cookies.set(COOKIE_SESION, await firmarSesion(sesion), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACION_SESION_SEG,
  });
  return respuesta;
}
