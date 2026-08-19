'use server';

/**
 * Padrón de socios.
 *
 * Las reglas que se aplican acá son del estatuto, no criterios nuestros. Están anotadas
 * con su artículo para que se puedan discutir contra el texto.
 */

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { CategoriaSocio, EstadoSocio, Prisma, Rol } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';
import {
  EDAD_FIN_CADETE,
  categoriaPorEdad,
  edad,
  puedeCambiarEstado,
  type NombreEstado,
} from '@/lib/socios';

type Resp = { ok: true } | { ok: false; error: string };

/**
 * Error de carga con un mensaje ya escrito para quien está llenando el formulario.
 *
 * Sirve para cortar una transacción a mitad de camino sin perder la explicación: lanzar
 * revierte todo, y el mensaje llega igual al formulario.
 */
class ErrorDeCarga extends Error {}

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

// ─── Grupo familiar ──────────────────────────────────────────────────────────

/**
 * Un integrante tal como viene del formulario del titular.
 *
 * Los campos llegan como listas paralelas —`fam.nombre` una vez por fila— y se leen por
 * posición. El formulario siempre manda todas las casillas de cada fila, aunque estén
 * vacías, justamente para que las posiciones no se corran.
 */
interface FilaFamiliar {
  id: string;
  nombre: string;
  dni: string;
  numeroSocio: number | null;
  fechaNacimiento: Date | null;
  parentesco: string;
}

function leerFamiliares(datos: FormData): FilaFamiliar[] {
  const ids = datos.getAll('fam.id').map(String);
  const nombres = datos.getAll('fam.nombre').map(String);
  const dnis = datos.getAll('fam.dni').map(String);
  const numeros = datos.getAll('fam.numeroSocio').map(String);
  const nacimientos = datos.getAll('fam.fechaNacimiento').map(String);
  const parentescos = datos.getAll('fam.parentesco').map(String);

  const filas: FilaFamiliar[] = [];
  for (let i = 0; i < nombres.length; i++) {
    const nombre = (nombres[i] ?? '').trim();
    const dni = (dnis[i] ?? '').trim();
    // Una fila del todo vacía es una que abrieron y no llenaron: se ignora.
    if (!nombre && !dni && !(ids[i] ?? '')) continue;

    const nac = (nacimientos[i] ?? '').trim();
    const fecha = nac ? new Date(`${nac}T00:00:00`) : null;

    filas.push({
      id: (ids[i] ?? '').trim(),
      nombre,
      dni,
      numeroSocio: Number((numeros[i] ?? '').trim()) || null,
      fechaNacimiento: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
      parentesco: (parentescos[i] ?? '').trim(),
    });
  }
  return filas;
}

/** Revisa las filas antes de tocar la base, para no dejar medio grupo cargado. */
function revisarFamiliares(filas: FilaFamiliar[]): string | null {
  const dnisVistos = new Set<string>();
  const numerosVistos = new Set<number>();

  for (const f of filas) {
    if (!f.nombre) return 'Cada integrante necesita nombre y apellido.';
    if (!/^\d{7,9}$/.test(f.dni)) {
      return `El DNI de ${f.nombre} tiene que ser de 7 a 9 dígitos, sin puntos.`;
    }
    if (!f.numeroSocio || f.numeroSocio < 1) {
      return `Falta el número de socio de ${f.nombre}.`;
    }
    if (dnisVistos.has(f.dni)) return `El DNI ${f.dni} está repetido en el grupo.`;
    if (numerosVistos.has(f.numeroSocio)) {
      return `El número de socio ${f.numeroSocio} está repetido en el grupo.`;
    }
    dnisVistos.add(f.dni);
    numerosVistos.add(f.numeroSocio);
  }
  return null;
}

/**
 * Deja el grupo del titular exactamente como vino del formulario.
 *
 * Lo que no está en la lista se desprende del grupo, **no se borra**: el padrón es
 * histórico y un socio nunca desaparece (queda suelto, con su cuota individual).
 */
async function sincronizarFamiliares(
  tx: Prisma.TransactionClient,
  titularId: string,
  fechaIngreso: Date,
  filas: FilaFamiliar[],
): Promise<string | null> {
  const conservados: string[] = [];

  for (const f of filas) {
    const datosPersona = {
      nombre: f.nombre,
      dni: f.dni,
      fechaNacimiento: f.fechaNacimiento,
    };

    if (f.id) {
      const actual = await tx.socio.findUnique({
        where: { id: f.id },
        select: { personaId: true },
      });
      if (!actual) return `${f.nombre} ya no está en el padrón.`;

      await tx.persona.update({ where: { id: actual.personaId }, data: datosPersona });
      await tx.socio.update({
        where: { id: f.id },
        data: { numeroSocio: f.numeroSocio!, parentesco: f.parentesco || null, titularId },
      });
      conservados.push(f.id);
      continue;
    }

    // Sin id: puede ser gente nueva o alguien que ya estaba suelto en el padrón. Se
    // busca por DNI antes de crear, que es lo que evita el duplicado.
    const persona = await tx.persona.findUnique({
      where: { dni: f.dni },
      select: { id: true, nombre: true, socio: { select: { id: true, titularId: true } } },
    });

    if (persona?.socio) {
      if (persona.socio.titularId && persona.socio.titularId !== titularId) {
        return `${persona.nombre} ya integra otro grupo familiar. Sacalo de ese grupo primero.`;
      }
      const tieneGrupoPropio = await tx.socio.count({ where: { titularId: persona.socio.id } });
      if (tieneGrupoPropio > 0) {
        return `${persona.nombre} es titular de su propio grupo familiar: no puede colgar de otro.`;
      }
      // Ya existe en el padrón: se lo suma al grupo y se le respeta su número, que es
      // su identidad. Los datos personales se corrigen desde su propia ficha.
      await tx.socio.update({
        where: { id: persona.socio.id },
        data: { titularId, parentesco: f.parentesco || null },
      });
      conservados.push(persona.socio.id);
      continue;
    }

    // Art. 22: el personal y los concesionarios no pueden ser socios.
    if (persona) {
      return `El DNI ${f.dni} ya está cargado como ${persona.nombre}, que no es socio. Un empleado o concesionario no puede serlo (art. 22).`;
    }

    const creada = await tx.persona.create({
      data: {
        ...datosPersona,
        socio: {
          create: {
            numeroSocio: f.numeroSocio!,
            // La categoría sale de la edad y no se pregunta: cambiarla después es un
            // acto estatutario y se hace desde el padrón, con su constancia.
            categoria: categoriaPorEdad(f.fechaNacimiento) as CategoriaSocio,
            fechaIngreso,
            parentesco: f.parentesco || null,
            titularId,
          },
        },
      },
      select: { socio: { select: { id: true } } },
    });
    if (creada.socio) conservados.push(creada.socio.id);
  }

  // Los que ya no figuran quedan sueltos.
  await tx.socio.updateMany({
    where: { titularId, id: { notIn: conservados.length ? conservados : ['-'] } },
    data: { titularId: null, parentesco: null },
  });

  return null;
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

    // Grupo familiar. No hay un grupo que crear: el grupo es este socio y los que se
    // carguen acá abajo, y se llama como él.
    const esGrupoFamiliar = texto(datos, 'esGrupoFamiliar') === 'on';
    const familiares = esGrupoFamiliar ? leerFamiliares(datos) : [];
    const problemaFamilia = revisarFamiliares(familiares);
    if (problemaFamilia) return fallo(problemaFamilia);

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
      observaciones: texto(datos, 'observaciones') || null,
    };

    await prisma.$transaction(async (tx) => {
      if (socioId) {
        const socio = await tx.socio.findUniqueOrThrow({
          where: { id: socioId },
          select: { personaId: true, titularId: true },
        });

        // Un familiar no puede a su vez encabezar un grupo: el grupo es de un solo
        // nivel, y encadenarlos rompe la cuenta de quién paga la cuota.
        if (esGrupoFamiliar && socio.titularId) {
          throw new ErrorDeCarga(
            'Este socio ya integra el grupo de otro. Para darle grupo propio, sacalo antes del grupo del titular.',
          );
        }

        await tx.persona.update({ where: { id: socio.personaId }, data: datosPersona });
        await tx.socio.update({ where: { id: socioId }, data: datosSocio });

        const problema = await sincronizarFamiliares(tx, socioId, ingreso, familiares);
        if (problema) throw new ErrorDeCarga(problema);

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
        const creada = await tx.persona.create({
          data: {
            ...datosPersona,
            socio: { create: datosSocio },
            ...(usuario
              ? { roles: { create: { rol: Rol.SOCIO, designadoPorId: sesion.personaId } } }
              : {}),
          },
          select: { socio: { select: { id: true } } },
        });

        // Los familiares cuelgan del titular, así que hace falta que exista primero.
        if (creada.socio && familiares.length > 0) {
          const problema = await sincronizarFamiliares(tx, creada.socio.id, ingreso, familiares);
          if (problema) throw new ErrorDeCarga(problema);
        }
      }
    });

    refrescar();
    return EXITO;
  } catch (e) {
    if (e instanceof ErrorDeCarga) return fallo(e.message);
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
