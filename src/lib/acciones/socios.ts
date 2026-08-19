'use server';

/**
 * Padrón de socios.
 *
 * Las reglas que se aplican acá son del estatuto, no criterios nuestros. Están anotadas
 * con su artículo para que se puedan discutir contra el texto.
 */

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { CategoriaSocio, EstadoSocio, Rol } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';
import {
  EDAD_FIN_CADETE,
  edad,
  puedeCambiarEstado,
  type NombreEstado,
} from '@/lib/socios';

type Resp = { ok: true } | { ok: false; error: string };

function refrescar() {
  revalidatePath('/secretaria', 'layout');
  revalidatePath('/admin', 'layout');
}

/** Lee una fecha del formulario. Devuelve null si vino vacía o mal escrita. */
function fecha(datos: FormData, campo: string): Date | null {
  const v = texto(datos, campo);
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Alta y edición ──────────────────────────────────────────────────────────

export async function guardarSocio(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_socios');

    const socioId = texto(datos, 'socioId');
    const nombre = texto(datos, 'nombre');
    const dni = texto(datos, 'dni');
    const nro = numero(datos, 'numeroSocio');
    const categoria = texto(datos, 'categoria') as CategoriaSocio;
    const ingreso = fecha(datos, 'fechaIngreso');
    const nacimiento = fecha(datos, 'fechaNacimiento');
    const permisoHasta = fecha(datos, 'permisoHasta');

    if (!nombre) return fallo('El nombre y apellido son obligatorios.');
    if (!/^\d{7,9}$/.test(dni)) return fallo('El DNI tiene que ser de 7 a 9 dígitos, sin puntos.');
    if (!nro || nro < 1) return fallo('El número de socio es obligatorio.');
    if (!Object.values(CategoriaSocio).includes(categoria)) return fallo('Elegí una categoría.');
    if (!ingreso) return fallo('La fecha de ingreso es obligatoria.');

    // Art. 14 inc. e: el transeúnte entra con un permiso a término, y los beneficios
    // caducan solos al vencer. Sin fecha de vencimiento la categoría no tiene sentido.
    if (categoria === CategoriaSocio.TRANSEUNTE && !permisoHasta) {
      return fallo('El transeúnte necesita una fecha de vencimiento del permiso (art. 14 inc. e).');
    }

    // Art. 14 inc. d: cadete es el menor de dieciocho años.
    if (categoria === CategoriaSocio.CADETE) {
      if (!nacimiento) return fallo('Para un cadete hace falta la fecha de nacimiento.');
      if (edad(nacimiento) >= EDAD_FIN_CADETE) {
        return fallo(
          `Ya tiene ${edad(nacimiento)} años: el cadete es menor de ${EDAD_FIN_CADETE} (art. 14 inc. d). Pasalo a activo.`,
        );
      }
    }

    // Acceso a la plataforma. Es opcional a propósito: un cadete de ocho años está en el
    // padrón pero no entra a la aplicación.
    const usuario = texto(datos, 'usuario').toLowerCase();
    const clave = texto(datos, 'clave');
    if (usuario && !/^[a-z0-9._@-]+$/.test(usuario)) {
      return fallo('El usuario sólo puede tener letras, números, arroba, puntos y guiones.');
    }
    if (!socioId && usuario && clave.length < 8) {
      return fallo('Si le das acceso, la contraseña tiene que tener al menos 8 caracteres.');
    }
    if (clave && clave.length < 8) {
      return fallo('La contraseña tiene que tener al menos 8 caracteres.');
    }
    const hash = clave ? await bcrypt.hash(clave, 10) : undefined;

    // Grupo familiar: se puede crear uno nuevo, sumarse a uno existente, o ninguno.
    const grupoExistente = texto(datos, 'grupoFamiliarId');
    const grupoNuevo = texto(datos, 'grupoFamiliarNuevo');
    const esTitular = texto(datos, 'esTitular') === 'on';

    const datosPersona = {
      nombre,
      dni,
      email: texto(datos, 'email') || null,
      telefono: texto(datos, 'telefono') || null,
      fechaNacimiento: nacimiento,
      ...(usuario ? { usuario } : {}),
      ...(hash ? { passwordHash: hash } : {}),
    };

    const datosSocio = {
      numeroSocio: nro,
      categoria,
      fechaIngreso: ingreso,
      permisoHasta: categoria === CategoriaSocio.TRANSEUNTE ? permisoHasta : null,
      esTitular,
      observaciones: texto(datos, 'observaciones') || null,
    };

    await prisma.$transaction(async (tx) => {
      let grupoFamiliarId: string | null = grupoExistente || null;
      if (grupoNuevo) {
        const grupo = await tx.grupoFamiliar.create({ data: { nombre: grupoNuevo } });
        grupoFamiliarId = grupo.id;
      }

      if (socioId) {
        const socio = await tx.socio.findUniqueOrThrow({
          where: { id: socioId },
          select: { personaId: true, grupoFamiliarId: true },
        });
        await tx.persona.update({ where: { id: socio.personaId }, data: datosPersona });
        await tx.socio.update({
          where: { id: socioId },
          data: {
            ...datosSocio,
            // Sin grupo elegido se conserva el que tenía: editar los datos personales
            // no puede sacarlo de su familia sin querer.
            grupoFamiliarId: grupoFamiliarId ?? socio.grupoFamiliarId,
          },
        });
        if (usuario) {
          const tieneRol = await tx.rolAsignado.findFirst({
            where: { personaId: socio.personaId, rol: Rol.SOCIO },
          });
          if (!tieneRol) {
            await tx.rolAsignado.create({
              data: { personaId: socio.personaId, rol: Rol.SOCIO, designadoPorId: sesion.personaId },
            });
          }
        }
      } else {
        await tx.persona.create({
          data: {
            ...datosPersona,
            socio: { create: { ...datosSocio, grupoFamiliarId } },
            ...(usuario
              ? { roles: { create: { rol: Rol.SOCIO, designadoPorId: sesion.personaId } } }
              : {}),
          },
        });
      }
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarSocio');
  }
}

// ─── Ciclo de vida ───────────────────────────────────────────────────────────

export async function cambiarEstadoSocio(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('actos_estatutarios');

    const socioId = texto(datos, 'socioId');
    const nuevo = texto(datos, 'estado') as EstadoSocio;
    const motivo = texto(datos, 'motivo');

    if (!Object.values(EstadoSocio).includes(nuevo)) return fallo('Elegí un estado.');

    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      select: { estado: true },
    });
    if (!socio) return fallo('El socio no existe.');
    if (socio.estado === nuevo) return fallo('Ya está en ese estado.');

    if (!puedeCambiarEstado(socio.estado as NombreEstado, nuevo as NombreEstado)) {
      // El caso que más importa: del expulsado no se vuelve (art. 29).
      if (socio.estado === EstadoSocio.EXPULSADO) {
        return fallo('Un socio expulsado no puede volver a ser admitido nunca (art. 29).');
      }
      return fallo(`No se puede pasar de ${socio.estado} a ${nuevo} directamente.`);
    }

    // El motivo se exige en los estados que perjudican al socio: si mañana reclama,
    // tiene que haber constancia de por qué.
    const exigenMotivo: EstadoSocio[] = [
      EstadoSocio.SUSPENDIDO,
      EstadoSocio.CESANTE,
      EstadoSocio.EXPULSADO,
    ];
    if (exigenMotivo.includes(nuevo) && !motivo) {
      return fallo('Dejá asentado el motivo: queda como constancia del acto.');
    }

    await prisma.$transaction([
      prisma.socio.update({ where: { id: socioId }, data: { estado: nuevo } }),
      prisma.actoEstatutario.create({
        data: {
          socioId,
          tipo: 'ESTADO',
          desde: socio.estado,
          hasta: nuevo,
          motivo: motivo || null,
          registradoPorId: sesion.personaId,
        },
      }),
    ]);

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'cambiarEstadoSocio');
  }
}

export async function cambiarCategoria(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('actos_estatutarios');

    const socioId = texto(datos, 'socioId');
    const nueva = texto(datos, 'categoria') as CategoriaSocio;
    if (!Object.values(CategoriaSocio).includes(nueva)) return fallo('Elegí una categoría.');

    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      select: { categoria: true, persona: { select: { fechaNacimiento: true } } },
    });
    if (!socio) return fallo('El socio no existe.');
    if (socio.categoria === nueva) return fallo('Ya está en esa categoría.');

    if (nueva === CategoriaSocio.CADETE) {
      const nac = socio.persona.fechaNacimiento;
      if (!nac) return fallo('Para pasarlo a cadete hace falta la fecha de nacimiento.');
      if (edad(nac) >= EDAD_FIN_CADETE) {
        return fallo(`El cadete es menor de ${EDAD_FIN_CADETE} años (art. 14 inc. d).`);
      }
    }

    await prisma.$transaction([
      prisma.socio.update({ where: { id: socioId }, data: { categoria: nueva } }),
      prisma.actoEstatutario.create({
        data: {
          socioId,
          tipo: 'CATEGORIA',
          desde: socio.categoria,
          hasta: nueva,
          motivo: texto(datos, 'motivo') || null,
          registradoPorId: sesion.personaId,
        },
      }),
    ]);

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'cambiarCategoria');
  }
}
