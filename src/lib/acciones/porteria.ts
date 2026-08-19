'use server';

/**
 * La puerta: identificar, decidir, cobrar, abrir y registrar.
 *
 * La decisión NO se toma acá: se toma en `resolverAcceso()`, que es una función pura y
 * está probada regla por regla. Este archivo sólo junta los datos que esa función
 * necesita y ejecuta lo que decidió.
 *
 * Todos los intentos se registran, también los rechazos. Saber quién llegó sin apto o
 * con la cuota vencida es justamente el dato que el club necesita del log.
 */

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  CondicionPersona, EstadoCaja, MedioPago, Prisma, ResultadoIngreso, TipoHabilitacion,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { prediosDelRolActivo } from '@/lib/sesion';
import { fallo, texto, traducirError } from '@/lib/acciones/comun';
import { resolverAcceso, conceptoACobrar, type DecisionAcceso } from '@/lib/acceso';
import { resolverPrecio, type ItemPrecio } from '@/lib/tarifario';

export interface PersonaEncontrada {
  personaId: string;
  nombre: string;
  dni: string;
  esSocio: boolean;
  numeroSocio: number | null;
  estado: string | null;
  categoria: string | null;
}

/** Búsqueda por nombre, DNI o número de socio. Es lo que teclea el portero. */
export async function buscarPersona(termino: string): Promise<PersonaEncontrada[]> {
  await exigirCapacidadApi('ver_socios');

  const q = termino.trim();
  if (q.length < 2) return [];
  const digitos = q.replace(/\D/g, '');

  const alternativas: Prisma.PersonaWhereInput[] = [
    { nombre: { contains: q, mode: 'insensitive' } },
  ];
  if (digitos) {
    alternativas.push({ dni: { startsWith: digitos } });
    const nro = Number(digitos);
    if (Number.isSafeInteger(nro)) alternativas.push({ socio: { numeroSocio: nro } });
  }

  const personas = await prisma.persona.findMany({
    where: { OR: alternativas },
    take: 12,
    orderBy: { nombre: 'asc' },
    include: { socio: { select: { numeroSocio: true, estado: true, categoria: true } } },
  });

  return personas.map((p) => ({
    personaId: p.id,
    nombre: p.nombre,
    dni: p.dni,
    esSocio: Boolean(p.socio),
    numeroSocio: p.socio?.numeroSocio ?? null,
    estado: p.socio?.estado ?? null,
    categoria: p.socio?.categoria ?? null,
  }));
}

export interface Evaluacion {
  decision: DecisionAcceso;
  nombre: string;
  concepto: string | null;
  precio: number | null;
  /** Cuando el tarifario no tiene precio cargado para lo que hay que cobrar. */
  faltaPrecio: boolean;
}

/**
 * Junta la situación de la persona y resuelve qué corresponde. No escribe nada: es lo
 * que el portero ve antes de confirmar.
 */
export async function evaluarAcceso(datos: {
  accesoId: string;
  personaId?: string | null;
  nombreVisita?: string;
  condicion?: string;
}): Promise<Evaluacion | { error: string }> {
  try {
    await exigirCapacidadApi('ver_socios');

    const acceso = await prisma.acceso.findUnique({
      where: { id: datos.accesoId },
      include: { predio: { select: { id: true, nombre: true } } },
    });
    if (!acceso) return { error: 'El puesto no existe.' };

    const ahora = new Date();
    let nombre = datos.nombreVisita?.trim() || 'Visitante';
    let situacion;

    if (datos.personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: datos.personaId },
        include: {
          socio: {
            include: {
              habilitaciones: { where: { hasta: { gte: ahora }, desde: { lte: ahora } } },
              lotes: { include: { autorizaciones: { where: { hasta: { gte: ahora }, aprobada: true } } } },
            },
          },
        },
      });
      if (!persona) return { error: 'La persona no existe.' };
      nombre = persona.nombre;

      const socio = persona.socio;
      const apto = socio?.habilitaciones.find((h) => h.tipo === TipoHabilitacion.APTO_MEDICO);
      const derechos = (socio?.habilitaciones ?? [])
        .filter((h) => h.tipo !== TipoHabilitacion.APTO_MEDICO && h.autorizado)
        .map((h) => h.tipo as string);

      situacion = {
        tipoAcceso: acceso.tipo,
        fecha: ahora,
        esSocio: Boolean(socio),
        estadoSocio: socio?.estado,
        categoria: socio?.categoria,
        permisoHasta: socio?.permisoHasta ?? null,
        aptoMedicoHasta: apto?.hasta ?? null,
        aptoMedicoAutorizado: apto?.autorizado,
        derechosVigentes: derechos,
        exigeAptoMedico: acceso.exigeAptoMedico,
        exigeDerecho: acceso.exigeDerecho,
        condicionDeclarada: datos.condicion,
      };
    } else {
      // Alguien que no está en el padrón. La autorización de estadía se busca por
      // nombre declarado, que es como el reglamento pide que se declaren (art. 10).
      const autorizada = nombre
        ? await prisma.autorizacionEstadia.findFirst({
            where: {
              aprobada: true,
              hasta: { gte: ahora },
              desde: { lte: ahora },
              personas: { has: nombre },
              lote: { predioId: acceso.predioId },
            },
          })
        : null;

      situacion = {
        tipoAcceso: acceso.tipo,
        fecha: ahora,
        esSocio: false,
        exigeAptoMedico: acceso.exigeAptoMedico,
        exigeDerecho: acceso.exigeDerecho,
        autorizacionEstadiaVigente: Boolean(autorizada),
        condicionDeclarada: datos.condicion,
      };
    }

    const decision = resolverAcceso(situacion);
    const concepto = conceptoACobrar(decision, acceso.exigeDerecho);

    let precio: number | null = null;
    let faltaPrecio = false;

    if (concepto && decision.cobrarComo) {
      const items = (await prisma.itemTarifario.findMany({ where: { concepto } })).map<ItemPrecio>(
        (i) => ({
          id: i.id,
          concepto: i.concepto,
          predioId: i.predioId,
          condicion: i.condicion,
          precio: Number(i.precio),
          vigenciaDesde: i.vigenciaDesde,
          vigenciaHasta: i.vigenciaHasta,
        }),
      );
      const item = resolverPrecio(items, {
        concepto,
        predioId: acceso.predioId,
        condicion: decision.cobrarComo,
        fecha: ahora,
      });
      if (item) precio = item.precio;
      else faltaPrecio = true;
    }

    return { decision, nombre, concepto, precio, faltaPrecio };
  } catch (e) {
    const r = traducirError(e, 'evaluarAcceso');
    return { error: r.error };
  }
}

type Resp = { ok: true } | { ok: false; error: string };

/**
 * Registra el ingreso —haya pasado o no— y cobra si corresponde.
 *
 * El cobro y el registro van en una sola transacción: no puede quedar un cobro sin
 * ingreso ni un ingreso cobrado que no figure en la caja.
 */
export async function confirmarIngreso(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('ver_socios');

    const accesoId = texto(datos, 'accesoId');
    const acceso = await prisma.acceso.findUnique({ where: { id: accesoId } });
    if (!acceso) return fallo('El puesto no existe.');

    // El portero y el control sólo operan en los predios que tienen asignados.
    const suyos = prediosDelRolActivo(sesion);
    if (suyos.length > 0 && !suyos.includes(acceso.predioId)) {
      return fallo('Ese puesto no pertenece a tu predio.');
    }

    const personaId = texto(datos, 'personaId') || null;
    const nombre = texto(datos, 'nombre') || 'Visitante';
    const permitido = texto(datos, 'permitido') === 'si';
    const motivo = texto(datos, 'motivo');
    const condicion = (texto(datos, 'condicion') || 'SOCIO') as CondicionPersona;

    const concepto = texto(datos, 'concepto');
    const importe = Number(texto(datos, 'importe') || '0');
    const medioPago = texto(datos, 'medioPago') as MedioPago;
    const hayQueCobrar = Boolean(concepto) && importe > 0;

    if (hayQueCobrar && !Object.values(MedioPago).includes(medioPago)) {
      return fallo('Elegí el medio de pago.');
    }
    // El punto de control no cobra nunca. Es la diferencia con la portería.
    if (hayQueCobrar && acceso.tipo !== 'PORTERIA') {
      return fallo('Un punto de control no cobra. El cobro se hace en la portería.');
    }

    const ahora = new Date();
    const caja = hayQueCobrar
      ? await prisma.caja.findFirst({
          where: { personaId: sesion.personaId, estado: EstadoCaja.ABIERTA },
          select: { id: true },
        })
      : null;

    if (hayQueCobrar && !caja) {
      return fallo('Abrí tu caja antes de cobrar: si no, el cobro no queda en ningún arqueo.');
    }

    await prisma.$transaction(async (tx) => {
      let cobroId: string | null = null;

      if (hayQueCobrar) {
        const socio = personaId
          ? await tx.socio.findUnique({ where: { personaId }, select: { id: true } })
          : null;

        const cobro = await tx.cobro.create({
          data: {
            claveUnica: randomUUID(),
            socioId: socio?.id ?? null,
            pagador: nombre,
            predioId: acceso.predioId,
            accesoId: acceso.id,
            cajaId: caja!.id,
            operadorId: sesion.personaId,
            medioPago,
            total: new Prisma.Decimal(importe),
            items: [{ concepto, importe, condicion }],
            ocurridoEn: ahora,
          },
        });
        cobroId = cobro.id;
      }

      await tx.ingreso.create({
        data: {
          accesoId: acceso.id,
          predioId: acceso.predioId,
          personaId,
          nombre,
          condicion,
          resultado: permitido ? ResultadoIngreso.PERMITIDO : ResultadoIngreso.RECHAZADO,
          motivo: motivo || null,
          cobroId,
          ocurridoEn: ahora,
        },
      });
    });

    revalidatePath('/porteria', 'layout');
    revalidatePath('/control', 'layout');
    revalidatePath('/predio', 'layout');
    return { ok: true };
  } catch (e) {
    return traducirError(e, 'confirmarIngreso');
  }
}
