'use server';

/**
 * Designaciones: alta de personas y asignación de roles.
 *
 * La regla que manda es `puedeDesignar()` de `roles.ts`. El Administrador General sólo
 * puede designar Secretario y Tesorero; el Secretario, casi todo el resto; el Tesorero,
 * únicamente cobradores. Eso no se chequea en la pantalla sino acá, que es donde no se
 * puede esquivar.
 */

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { acotadoAPredio, puedeDesignar, ROLES } from '@/lib/roles';
import { fallo, texto, traducirError, EXITO } from '@/lib/acciones/comun';

type Resp = { ok: true } | { ok: false; error: string };

const LARGO_MINIMO_CLAVE = 8;

function refrescar() {
  revalidatePath('/secretaria', 'layout');
  revalidatePath('/admin', 'layout');
  revalidatePath('/tesoreria', 'layout');
}

export async function guardarPersona(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('designar_roles');

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    const dni = texto(datos, 'dni');
    const usuario = texto(datos, 'usuario').toLowerCase();
    const clave = texto(datos, 'clave');
    const rol = texto(datos, 'rol') as Rol;
    const predioId = texto(datos, 'predioId') || null;

    if (!nombre) return fallo('El nombre y apellido son obligatorios.');
    if (!/^\d{7,9}$/.test(dni)) return fallo('El DNI tiene que ser de 7 a 9 dígitos, sin puntos.');
    if (!usuario) return fallo('El usuario es obligatorio.');
    if (!/^[a-z0-9._-]+$/.test(usuario)) {
      return fallo('El usuario sólo puede tener letras, números, puntos, guiones y guiones bajos.');
    }

    if (!Object.values(Rol).includes(rol)) return fallo('Elegí un rol.');
    if (!puedeDesignar(sesion.rolActivo, rol)) {
      return fallo(`Tu rol no puede designar ${ROLES[rol].etiqueta}.`);
    }
    if (acotadoAPredio(rol) && !predioId) {
      return fallo(`${ROLES[rol].etiqueta} trabaja en un predio: elegí cuál.`);
    }

    // En el alta la contraseña es obligatoria; al editar, en blanco significa dejarla como está.
    if (!id && clave.length < LARGO_MINIMO_CLAVE) {
      return fallo(`La contraseña tiene que tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
    }
    if (id && clave && clave.length < LARGO_MINIMO_CLAVE) {
      return fallo(`La contraseña nueva tiene que tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
    }

    const hash = clave ? await bcrypt.hash(clave, 10) : undefined;
    const asignacion = { rol, predioId: acotadoAPredio(rol) ? predioId : null };

    if (id) {
      await prisma.persona.update({
        where: { id },
        data: { nombre, dni, usuario, ...(hash ? { passwordHash: hash } : {}) },
      });
      // El rol se agrega si todavía no lo tiene; los que ya tenía no se tocan.
      const yaLoTiene = await prisma.rolAsignado.findFirst({
        where: { personaId: id, ...asignacion },
      });
      if (!yaLoTiene) {
        await prisma.rolAsignado.create({
          data: { personaId: id, ...asignacion, designadoPorId: sesion.personaId },
        });
      }
    } else {
      await prisma.persona.create({
        data: {
          nombre,
          dni,
          usuario,
          passwordHash: hash,
          email: texto(datos, 'email') || null,
          telefono: texto(datos, 'telefono') || null,
          roles: { create: { ...asignacion, designadoPorId: sesion.personaId } },
        },
      });
    }

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarPersona');
  }
}

/** Da de baja o vuelve a habilitar el ingreso de una persona. Nunca se borra. */
export async function alternarPersona(id: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('designar_roles');
    if (id === sesion.personaId) return fallo('No podés darte de baja a vos mismo.');

    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { activo: true, roles: { select: { rol: true } } },
    });
    if (!persona) return fallo('La persona no existe.');

    // Sólo se puede tocar a alguien cuyos roles uno pueda designar.
    const alcanza = persona.roles.every((r) => puedeDesignar(sesion.rolActivo, r.rol));
    if (!alcanza) return fallo('Esa persona tiene roles que tu rol no administra.');

    await prisma.persona.update({ where: { id }, data: { activo: !persona.activo } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'alternarPersona');
  }
}

/** Quita un rol concreto. Si le quedaría ninguno, se avisa en vez de dejarla sin acceso. */
export async function quitarRol(rolAsignadoId: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('designar_roles');

    const asignado = await prisma.rolAsignado.findUnique({
      where: { id: rolAsignadoId },
      select: { rol: true, personaId: true },
    });
    if (!asignado) return fallo('Esa asignación ya no existe.');
    if (!puedeDesignar(sesion.rolActivo, asignado.rol)) {
      return fallo(`Tu rol no puede quitar ${ROLES[asignado.rol].etiqueta}.`);
    }

    const cuantos = await prisma.rolAsignado.count({ where: { personaId: asignado.personaId } });
    if (cuantos <= 1) {
      return fallo('Es su único rol. Si no tiene que entrar más, dala de baja en vez de quitárselo.');
    }

    await prisma.rolAsignado.delete({ where: { id: rolAsignadoId } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'quitarRol');
  }
}
