'use server';

/**
 * Reservas del socio: alojamiento por noche, canchas y quinchos por hora.
 *
 * La disponibilidad se comprueba SIEMPRE contra la base al confirmar, no sólo al
 * mostrar el calendario: entre que alguien ve un turno libre y aprieta el botón, otro
 * pudo haberlo tomado.
 */

import { revalidatePath } from 'next/cache';
import { EstadoReserva, EstadoSocio } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';

type Resp = { ok: true } | { ok: false; error: string };

/** Estados en los que el socio no puede reservar nada. */
const NO_RESERVAN: EstadoSocio[] = [
  EstadoSocio.CESANTE,
  EstadoSocio.EXPULSADO,
  EstadoSocio.SUSPENDIDO,
];

function refrescar() {
  revalidatePath('/socio', 'layout');
  revalidatePath('/predio', 'layout');
}

/** Combina una fecha «2026-09-05» con una hora «14:00». */
function momento(fecha: string, hora: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const h = /^\d{2}:\d{2}$/.test(hora) ? hora : '00:00';
  const d = new Date(`${fecha}T${h}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ¿Hay algo reservado que se pise con este rango?
 *
 * Dos reservas se solapan si una empieza antes de que la otra termine y termina
 * después de que la otra empiece. Las canceladas y las ausencias no cuentan.
 */
async function hayCruce(
  campo: 'alojamientoId' | 'espacioId',
  recursoId: string,
  desde: Date,
  hasta: Date,
  exceptoId?: string,
): Promise<boolean> {
  const cruce = await prisma.reserva.findFirst({
    where: {
      [campo]: recursoId,
      estado: { in: [EstadoReserva.ACTIVA, EstadoReserva.CONFIRMADA] },
      desde: { lt: hasta },
      hasta: { gt: desde },
      ...(exceptoId ? { id: { not: exceptoId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(cruce);
}

export async function reservar(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('panel_socio');

    const socio = await prisma.socio.findUnique({
      where: { personaId: sesion.personaId },
      select: { id: true, estado: true },
    });
    if (!socio) return fallo('Tu ficha de socio no está cargada. Comunicate con Secretaría.');
    if (NO_RESERVAN.includes(socio.estado)) {
      return fallo('Tu cuenta no está habilitada para reservar. Comunicate con Secretaría.');
    }

    const alojamientoId = texto(datos, 'alojamientoId') || null;
    const espacioId = texto(datos, 'espacioId') || null;
    if (!alojamientoId && !espacioId) return fallo('Elegí qué querés reservar.');
    if (alojamientoId && espacioId) return fallo('Elegí una sola cosa.');

    const personas = numero(datos, 'personas', 1) ?? 1;
    const fechaDesde = texto(datos, 'fechaDesde');
    const fechaHasta = texto(datos, 'fechaHasta');
    const hora = texto(datos, 'hora');

    let desde: Date | null;
    let hasta: Date | null;

    if (alojamientoId) {
      // Por noche: entra un día y sale otro.
      desde = momento(fechaDesde, '14:00');
      hasta = momento(fechaHasta, '10:00');
      if (!desde || !hasta) return fallo('Indicá desde qué día y hasta qué día.');
      if (hasta <= desde) return fallo('La salida tiene que ser posterior a la entrada.');

      const alojamiento = await prisma.alojamiento.findUnique({ where: { id: alojamientoId } });
      if (!alojamiento || !alojamiento.activo) return fallo('Ese alojamiento no está disponible.');
      if (personas > alojamiento.capacidadMax) {
        return fallo(`${alojamiento.nombre} admite hasta ${alojamiento.capacidadMax} personas.`);
      }
      if (await hayCruce('alojamientoId', alojamientoId, desde, hasta)) {
        return fallo('Esas fechas ya están tomadas. Probá con otras.');
      }
    } else {
      // Por hora o por bloque, según cómo se reserve el espacio.
      const espacio = await prisma.espacio.findUnique({ where: { id: espacioId! } });
      if (!espacio || !espacio.activo) return fallo('Ese espacio no está disponible.');

      desde = momento(fechaDesde, hora);
      if (!desde) return fallo('Indicá el día y la hora.');

      const duracion = espacio.unidad === 'BLOQUE' ? (espacio.bloqueHoras ?? 5) : 1;
      hasta = new Date(desde.getTime() + duracion * 60 * 60 * 1000);

      if (desde < new Date()) return fallo('No se puede reservar un turno que ya pasó.');
      if (await hayCruce('espacioId', espacioId!, desde, hasta)) {
        return fallo('Ese turno ya está tomado. Elegí otro horario.');
      }
    }

    await prisma.reserva.create({
      data: {
        socioId: socio.id,
        alojamientoId,
        espacioId,
        desde,
        hasta,
        personas,
        observaciones: texto(datos, 'observaciones') || null,
      },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'reservar');
  }
}

/**
 * Cancela una reserva propia.
 *
 * Se respeta la ventana de cancelación del espacio: cancelar una cancha de alta demanda
 * media hora antes deja el turno perdido para todos.
 */
export async function cancelarReserva(id: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('panel_socio');

    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: { socio: { select: { personaId: true } }, espacio: true },
    });
    if (!reserva) return fallo('La reserva no existe.');
    if (reserva.socio.personaId !== sesion.personaId) {
      return fallo('Esa reserva no es tuya.');
    }
    if (reserva.estado === EstadoReserva.CANCELADA) return fallo('Ya estaba cancelada.');

    const horasQueFaltan = (reserva.desde.getTime() - Date.now()) / 3_600_000;
    const ventana = reserva.espacio?.ventanaCancelacionHoras ?? 0;
    if (ventana > 0 && horasQueFaltan < ventana && horasQueFaltan > 0) {
      return fallo(
        `Se puede cancelar hasta ${ventana} horas antes. Comunicate con el predio si necesitás darla de baja igual.`,
      );
    }

    await prisma.reserva.update({ where: { id }, data: { estado: EstadoReserva.CANCELADA } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'cancelarReserva');
  }
}

/**
 * Reserva prioritaria del Jefe de predio: puede tomar un turno por encima de la
 * disponibilidad pública, para un evento del club o un mantenimiento.
 */
export async function reservaPrioritaria(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('reservar_prioritario');

    const socio = await prisma.socio.findUnique({
      where: { personaId: sesion.personaId },
      select: { id: true },
    });
    if (!socio) {
      return fallo('Para reservar hace falta tener ficha de socio. Comunicate con Secretaría.');
    }

    const espacioId = texto(datos, 'espacioId');
    const alojamientoId = texto(datos, 'alojamientoId') || null;
    const desde = momento(texto(datos, 'fechaDesde'), texto(datos, 'hora') || '00:00');
    const horas = numero(datos, 'horas', 1) ?? 1;
    if (!desde) return fallo('Indicá el día y la hora.');

    await prisma.reserva.create({
      data: {
        socioId: socio.id,
        espacioId: espacioId || null,
        alojamientoId,
        desde,
        hasta: new Date(desde.getTime() + horas * 3_600_000),
        personas: numero(datos, 'personas', 1) ?? 1,
        prioritaria: true,
        estado: EstadoReserva.CONFIRMADA,
        observaciones: texto(datos, 'observaciones') || 'Reserva del predio',
      },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'reservaPrioritaria');
  }
}
