'use server';

/**
 * Grupos de actividad: lo que administra el profesor.
 *
 * El profesor sólo toca SUS grupos. No ve los de otros profesores ni puede inscribir a
 * nadie en un grupo ajeno: su rol lo habilita para lo suyo, no para la actividad entera.
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { casilla, fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';

type Resp = { ok: true } | { ok: false; error: string };

function refrescar() {
  revalidatePath('/profesor', 'layout');
  revalidatePath('/socio', 'layout');
}

/** El grupo tiene que ser de quien lo toca, salvo que sea Secretaría. */
async function esMiGrupo(grupoId: string, personaId: string): Promise<boolean> {
  const g = await prisma.grupo.findUnique({ where: { id: grupoId }, select: { profesorId: true } });
  return Boolean(g && g.profesorId === personaId);
}

export async function guardarGrupo(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_grupos');

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    const actividadId = texto(datos, 'actividadId');

    if (!nombre) return fallo('Poné un nombre al grupo, por ejemplo «Infantiles martes y jueves».');
    if (!actividadId) return fallo('Elegí a qué actividad pertenece.');
    if (id && !(await esMiGrupo(id, sesion.personaId))) {
      return fallo('Ese grupo no es tuyo.');
    }

    const campos = {
      nombre,
      actividadId,
      predioId: texto(datos, 'predioId') || null,
      cupo: numero(datos, 'cupo', 0) ?? 0,
      profesorId: sesion.personaId,
    };

    if (id) await prisma.grupo.update({ where: { id }, data: campos });
    else await prisma.grupo.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarGrupo');
  }
}

export async function alternarGrupo(id: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_grupos');
    if (!(await esMiGrupo(id, sesion.personaId))) return fallo('Ese grupo no es tuyo.');

    const g = await prisma.grupo.findUnique({ where: { id }, select: { activo: true } });
    if (!g) return fallo('El grupo no existe.');
    await prisma.grupo.update({ where: { id }, data: { activo: !g.activo } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'alternarGrupo');
  }
}

export async function guardarHorarioGrupo(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_grupos');
    const grupoId = texto(datos, 'grupoId');
    if (!(await esMiGrupo(grupoId, sesion.personaId))) return fallo('Ese grupo no es tuyo.');

    const dia = numero(datos, 'dia');
    const hora = texto(datos, 'hora');
    if (!dia || dia < 1 || dia > 7) return fallo('Elegí el día.');
    if (!/^\d{2}:\d{2}$/.test(hora)) return fallo('La hora va como 18:00.');

    await prisma.horarioGrupo.create({
      data: { grupoId, dia, hora, minutos: numero(datos, 'minutos', 60) ?? 60 },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarHorarioGrupo');
  }
}

export async function borrarHorarioGrupo(id: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_grupos');
    const h = await prisma.horarioGrupo.findUnique({ where: { id }, select: { grupoId: true } });
    if (!h || !(await esMiGrupo(h.grupoId, sesion.personaId))) return fallo('Ese horario no es tuyo.');

    await prisma.horarioGrupo.delete({ where: { id } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'borrarHorarioGrupo');
  }
}

export async function inscribirEnGrupo(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_grupos');
    const grupoId = texto(datos, 'grupoId');
    const socioId = texto(datos, 'socioId');

    if (!(await esMiGrupo(grupoId, sesion.personaId))) return fallo('Ese grupo no es tuyo.');
    if (!socioId) return fallo('Elegí a quién inscribir.');

    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: { _count: { select: { inscripciones: { where: { activa: true } } } } },
    });
    if (!grupo) return fallo('El grupo no existe.');
    if (grupo.cupo > 0 && grupo._count.inscripciones >= grupo.cupo) {
      return fallo(`El grupo está completo: ${grupo.cupo} lugares.`);
    }

    await prisma.inscripcionGrupo.upsert({
      where: { grupoId_socioId: { grupoId, socioId } },
      update: { activa: true },
      create: { grupoId, socioId },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'inscribirEnGrupo');
  }
}

export async function quitarDelGrupo(inscripcionId: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_grupos');
    const i = await prisma.inscripcionGrupo.findUnique({
      where: { id: inscripcionId },
      select: { grupoId: true },
    });
    if (!i || !(await esMiGrupo(i.grupoId, sesion.personaId))) return fallo('Esa inscripción no es tuya.');

    // Se desactiva en vez de borrarse: la asistencia del alumno ya registrada se conserva.
    await prisma.inscripcionGrupo.update({ where: { id: inscripcionId }, data: { activa: false } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'quitarDelGrupo');
  }
}

/**
 * Toma la asistencia de una fecha.
 *
 * Llegan sólo los presentes; el resto se marca ausente. Se rehace por completo cada vez
 * para que corregir una lista sea volver a mandarla, sin estados intermedios raros.
 */
export async function tomarAsistencia(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_grupos');

    const grupoId = texto(datos, 'grupoId');
    if (!(await esMiGrupo(grupoId, sesion.personaId))) return fallo('Ese grupo no es tuyo.');

    const dia = texto(datos, 'fecha');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return fallo('Elegí la fecha de la clase.');
    const fecha = new Date(`${dia}T00:00:00`);

    const presentes = new Set(
      datos.getAll('presente').filter((v): v is string => typeof v === 'string'),
    );

    const inscriptos = await prisma.inscripcionGrupo.findMany({
      where: { grupoId, activa: true },
      select: { socioId: true },
    });

    await prisma.$transaction([
      prisma.asistencia.deleteMany({ where: { grupoId, fecha } }),
      prisma.asistencia.createMany({
        data: inscriptos.map((i) => ({
          grupoId,
          socioId: i.socioId,
          fecha,
          presente: presentes.has(i.socioId),
        })),
      }),
    ]);

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'tomarAsistencia');
  }
}
