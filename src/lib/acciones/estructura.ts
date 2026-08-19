'use server';

/**
 * Alta, baja y modificación de la estructura del club: predios y todo lo que cuelga de
 * ellos. Es lo que hace que el club se pueda cargar sin tocar código.
 *
 * Nada se borra de verdad: se desactiva. Un predio dado de baja tiene años de ingresos
 * y cobros colgando, y el historial no se tira.
 */

import { revalidatePath } from 'next/cache';
import { TipoAcceso, TipoAlojamiento, TipoEspacio, UnidadReserva, ModoReserva } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { aSlug, casilla, fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';

type Resp = { ok: true } | { ok: false; error: string };

function refrescar() {
  revalidatePath('/secretaria', 'layout');
}

// ─── Predios ─────────────────────────────────────────────────────────────────

export async function guardarPredio(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    if (!nombre) return fallo('El nombre del predio es obligatorio.');

    const campos = {
      nombre,
      direccion: texto(datos, 'direccion') || null,
      conexionSatelital: casilla(datos, 'conexionSatelital'),
      orden: numero(datos, 'orden', 0) ?? 0,
    };

    if (id) {
      await prisma.predio.update({ where: { id }, data: campos });
    } else {
      await prisma.predio.create({ data: { ...campos, slug: aSlug(nombre) } });
    }

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarPredio');
  }
}

export async function alternarPredio(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');
    const predio = await prisma.predio.findUnique({ where: { id }, select: { activo: true } });
    if (!predio) return fallo('El predio no existe.');
    await prisma.predio.update({ where: { id }, data: { activo: !predio.activo } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'alternarPredio');
  }
}

// ─── Accesos ─────────────────────────────────────────────────────────────────

export async function guardarAcceso(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    const predioId = texto(datos, 'predioId');
    const tipo = texto(datos, 'tipo') as TipoAcceso;

    if (!nombre) return fallo('El nombre del acceso es obligatorio.');
    if (!predioId) return fallo('Elegí a qué predio pertenece.');
    if (!Object.values(TipoAcceso).includes(tipo)) return fallo('Elegí el tipo de acceso.');

    const dispositivoTipo = texto(datos, 'dispositivoTipo') || null;

    // En los predios con Starlink el interruptor tiene que salir por la red local: una
    // orden por la nube de eWeLink sube y baja por satélite dos veces.
    if (dispositivoTipo === 'sonoff_cloud') {
      const predio = await prisma.predio.findUnique({
        where: { id: predioId },
        select: { conexionSatelital: true, nombre: true },
      });
      if (predio?.conexionSatelital) {
        return fallo(
          `${predio.nombre} se conecta por satélite. Ahí el interruptor tiene que ir por red local (relay USB o Sonoff en la LAN): por la nube, la orden tarda segundos en abrir.`,
        );
      }
    }

    const campos = {
      nombre,
      predioId,
      tipo,
      dispositivoTipo,
      dispositivoRef: texto(datos, 'dispositivoRef') || null,
    };

    if (id) await prisma.acceso.update({ where: { id }, data: campos });
    else await prisma.acceso.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarAcceso');
  }
}

export async function alternarAcceso(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');
    const acceso = await prisma.acceso.findUnique({ where: { id }, select: { activo: true } });
    if (!acceso) return fallo('El acceso no existe.');
    await prisma.acceso.update({ where: { id }, data: { activo: !acceso.activo } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'alternarAcceso');
  }
}

// ─── Alojamientos (se reservan por noche) ────────────────────────────────────

export async function guardarAlojamiento(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    const predioId = texto(datos, 'predioId');
    const tipo = texto(datos, 'tipo') as TipoAlojamiento;

    if (!nombre) return fallo('El nombre es obligatorio.');
    if (!predioId) return fallo('Elegí a qué predio pertenece.');
    if (!Object.values(TipoAlojamiento).includes(tipo)) return fallo('Elegí el tipo.');

    const base = numero(datos, 'capacidadBase', 4) ?? 4;
    const max = numero(datos, 'capacidadMax', base) ?? base;
    if (base < 1) return fallo('La capacidad base tiene que ser al menos 1.');
    if (max < base) return fallo('La capacidad máxima no puede ser menor que la base.');

    const campos = {
      nombre,
      predioId,
      tipo,
      capacidadBase: base,
      capacidadMax: max,
      modoReserva: (texto(datos, 'modoReserva') as ModoReserva) || ModoReserva.ANTICIPADA,
    };

    if (id) await prisma.alojamiento.update({ where: { id }, data: campos });
    else await prisma.alojamiento.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarAlojamiento');
  }
}

export async function alternarAlojamiento(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');
    const a = await prisma.alojamiento.findUnique({ where: { id }, select: { activo: true } });
    if (!a) return fallo('El alojamiento no existe.');
    await prisma.alojamiento.update({ where: { id }, data: { activo: !a.activo } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'alternarAlojamiento');
  }
}

// ─── Espacios: canchas por hora, quinchos por bloque ─────────────────────────

export async function guardarEspacio(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    const predioId = texto(datos, 'predioId');
    const tipo = texto(datos, 'tipo') as TipoEspacio;
    const unidad = (texto(datos, 'unidad') as UnidadReserva) || UnidadReserva.HORA;

    if (!nombre) return fallo('El nombre es obligatorio.');
    if (!predioId) return fallo('Elegí a qué predio pertenece.');
    if (!Object.values(TipoEspacio).includes(tipo)) return fallo('Elegí el tipo.');

    const bloque = numero(datos, 'bloqueHoras');
    if (unidad === UnidadReserva.BLOQUE && (!bloque || bloque < 1)) {
      return fallo('Si se reserva por bloque, indicá de cuántas horas es.');
    }

    const campos = {
      nombre,
      predioId,
      tipo,
      unidad,
      bloqueHoras: unidad === UnidadReserva.BLOQUE ? bloque : null,
      altaDemanda: casilla(datos, 'altaDemanda'),
      ventanaCancelacionHoras: numero(datos, 'ventanaCancelacionHoras', 12) ?? 12,
    };

    if (id) await prisma.espacio.update({ where: { id }, data: campos });
    else await prisma.espacio.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarEspacio');
  }
}

export async function alternarEspacio(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');
    const e = await prisma.espacio.findUnique({ where: { id }, select: { activo: true } });
    if (!e) return fallo('El espacio no existe.');
    await prisma.espacio.update({ where: { id }, data: { activo: !e.activo } });
    refrescar();
    return EXITO;
  } catch (err) {
    return traducirError(err, 'alternarEspacio');
  }
}

// ─── Actividades ─────────────────────────────────────────────────────────────

export async function guardarActividad(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    if (!nombre) return fallo('El nombre de la actividad es obligatorio.');

    const modalidad = texto(datos, 'modalidad') || 'mensual';
    // Una actividad puede dictarse en más de un predio: la colonia de verano se da en
    // los dos de la ciudad.
    const predios = datos.getAll('predios').filter((p): p is string => typeof p === 'string');
    if (predios.length === 0) return fallo('Elegí al menos un predio donde se dicta.');

    if (id) {
      await prisma.$transaction([
        prisma.actividad.update({ where: { id }, data: { nombre, modalidad } }),
        prisma.actividadPredio.deleteMany({ where: { actividadId: id } }),
        prisma.actividadPredio.createMany({
          data: predios.map((predioId) => ({ actividadId: id, predioId })),
        }),
      ]);
    } else {
      await prisma.actividad.create({
        data: { nombre, modalidad, predios: { create: predios.map((predioId) => ({ predioId })) } },
      });
    }

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarActividad');
  }
}

export async function alternarActividad(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');
    const a = await prisma.actividad.findUnique({ where: { id }, select: { activo: true } });
    if (!a) return fallo('La actividad no existe.');
    await prisma.actividad.update({ where: { id }, data: { activo: !a.activo } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'alternarActividad');
  }
}
