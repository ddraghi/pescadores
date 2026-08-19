'use server';

/**
 * Cobro de conceptos sueltos en la portería.
 *
 * La pantalla de ingreso cobra la entrada, que es lo que se resuelve solo. Pero en el
 * mostrador se cobran muchas otras cosas del tarifario: el quincho, la bajada de lancha,
 * el derecho de pileta, la revisación de enfermería. Eso es esto.
 *
 * Los precios se resuelven SIEMPRE en el servidor contra el tarifario. Lo que manda el
 * navegador es qué se cobra y a quién, nunca cuánto.
 */

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  CondicionPersona, EstadoCaja, MedioPago, Prisma, TipoHabilitacion,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { fallo, texto, traducirError, EXITO } from '@/lib/acciones/comun';
import { resolverPrecio, type ItemPrecio } from '@/lib/tarifario';

type Resp = { ok: true } | { ok: false; error: string };

/**
 * Conceptos que además de cobrarse otorgan una habilitación con vigencia.
 * El derecho de pileta dura la temporada; la revisación la emite el médico aparte.
 */
const OTORGAN_DERECHO: Record<string, { tipo: TipoHabilitacion; dias: number }> = {
  'Derecho de pileta': { tipo: TipoHabilitacion.DERECHO_PILETA, dias: 150 },
};

export async function cobrarEnMostrador(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('cobrar');

    const caja = await prisma.caja.findFirst({
      where: { personaId: sesion.personaId, estado: EstadoCaja.ABIERTA },
      select: { id: true, predioId: true },
    });
    if (!caja) return fallo('Abrí tu caja antes de cobrar.');

    const personaId = texto(datos, 'personaId') || null;
    const nombreManual = texto(datos, 'nombre');
    const condicion = (texto(datos, 'condicion') || 'SOCIO') as CondicionPersona;
    const medioPago = texto(datos, 'medioPago') as MedioPago;

    if (!Object.values(MedioPago).includes(medioPago)) return fallo('Elegí el medio de pago.');
    if (!Object.values(CondicionPersona).includes(condicion)) return fallo('Elegí la condición.');

    const conceptos = datos.getAll('concepto').filter((c): c is string => typeof c === 'string');
    if (conceptos.length === 0) return fallo('Elegí al menos un concepto.');

    let nombre = nombreManual;
    let socioId: string | null = null;
    if (personaId) {
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        include: { socio: { select: { id: true } } },
      });
      if (!persona) return fallo('La persona no existe.');
      nombre = persona.nombre;
      socioId = persona.socio?.id ?? null;
    }
    if (!nombre) return fallo('Indicá a nombre de quién se cobra.');

    const ahora = new Date();
    const items = (await prisma.itemTarifario.findMany({
      where: { concepto: { in: conceptos } },
    })).map<ItemPrecio>((i) => ({
      id: i.id,
      concepto: i.concepto,
      predioId: i.predioId,
      condicion: i.condicion,
      precio: Number(i.precio),
      vigenciaDesde: i.vigenciaDesde,
      vigenciaHasta: i.vigenciaHasta,
    }));

    const lineas: { concepto: string; cantidad: number; importe: number }[] = [];
    for (const concepto of conceptos) {
      const cantidad = Math.max(1, Number(texto(datos, `cantidad_${concepto}`) || '1'));
      const item = resolverPrecio(items, {
        concepto,
        predioId: caja.predioId,
        condicion,
        fecha: ahora,
      });
      if (!item) {
        return fallo(`No hay precio cargado para «${concepto}» en este predio con esa condición.`);
      }
      lineas.push({ concepto, cantidad, importe: item.precio * cantidad });
    }

    const total = lineas.reduce((s, l) => s + l.importe, 0);

    await prisma.$transaction(async (tx) => {
      await tx.cobro.create({
        data: {
          claveUnica: randomUUID(),
          socioId,
          pagador: nombre,
          predioId: caja.predioId,
          cajaId: caja.id,
          operadorId: sesion.personaId,
          medioPago,
          total: new Prisma.Decimal(total),
          items: lineas,
          ocurridoEn: ahora,
        },
      });

      // Los conceptos que otorgan un derecho lo dejan cargado en el acto: si el socio
      // paga el derecho de pileta y va derecho al control, tiene que poder pasar.
      if (socioId) {
        for (const l of lineas) {
          const otorga = OTORGAN_DERECHO[l.concepto];
          if (!otorga) continue;
          const hasta = new Date(ahora);
          hasta.setDate(hasta.getDate() + otorga.dias);
          await tx.habilitacion.create({
            data: {
              socioId,
              tipo: otorga.tipo,
              autorizado: true,
              desde: ahora,
              hasta,
              novedades: `Otorgado al cobrar «${l.concepto}»`,
              emisorId: sesion.personaId,
            },
          });
        }
      }
    });

    revalidatePath('/porteria', 'layout');
    revalidatePath('/medico', 'layout');
    revalidatePath('/tesoreria', 'layout');
    return EXITO;
  } catch (e) {
    return traducirError(e, 'cobrarEnMostrador');
  }
}
