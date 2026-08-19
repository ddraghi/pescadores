'use server';

/**
 * Barrio de viviendas de fin de semana del Nihuil.
 *
 * El club cede lotes en concesión precaria a socios activos o vitalicios con dos años de
 * antigüedad, para casas de uso temporario (arts. 1 a 3 del reglamento). Nada de esto se
 * reserva: se adjudica.
 *
 * La parte que toca la operación diaria es la autorización de estadía: prestar la
 * vivienda a terceros exige permiso con los nombres declarados y **máximo 15 días**, y
 * sin ese permiso la portería no los deja pasar (arts. 9 y 10).
 */

import { revalidatePath } from 'next/cache';
import { CategoriaSocio } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { casilla, fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';
import { ANIOS_ANTIGUEDAD_LOTE, DIAS_MAXIMOS_ESTADIA } from '@/lib/barrio';

type Resp = { ok: true } | { ok: false; error: string };


function refrescar() {
  revalidatePath('/secretaria', 'layout');
  revalidatePath('/socio', 'layout');
  revalidatePath('/porteria', 'layout');
}

export async function guardarLote(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_estructura');

    const id = texto(datos, 'id');
    const numeroLote = texto(datos, 'numero');
    const predioId = texto(datos, 'predioId');
    if (!numeroLote) return fallo('El número de lote es obligatorio.');
    if (!predioId) return fallo('Elegí el predio.');

    const adjudicatarioId = texto(datos, 'adjudicatarioId') || null;

    // Art. 3: para tener un lote hay que ser socio activo o vitalicio, mayor de edad, y
    // tener dos años de antigüedad (o pagar lo que fije la comisión).
    if (adjudicatarioId) {
      const socio = await prisma.socio.findUnique({
        where: { id: adjudicatarioId },
        include: { persona: { select: { nombre: true } } },
      });
      if (!socio) return fallo('Ese socio no existe.');

      const admitidas: CategoriaSocio[] = [CategoriaSocio.ACTIVO, CategoriaSocio.VITALICIO];
      if (!admitidas.includes(socio.categoria)) {
        return fallo(
          `${socio.persona.nombre} es ${socio.categoria.toLowerCase()}: el lote se adjudica a socios activos o vitalicios (art. 3 inc. a).`,
        );
      }

      const anios = (Date.now() - socio.fechaIngreso.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (anios < ANIOS_ANTIGUEDAD_LOTE && !casilla(datos, 'eximirAntiguedad')) {
        return fallo(
          `Tiene ${Math.floor(anios)} años de antigüedad y hacen falta ${ANIOS_ANTIGUEDAD_LOTE} (art. 3 inc. b). Se puede eximir si abonó lo que fijó la comisión: marcá la casilla.`,
        );
      }
    }

    const fechaTexto = texto(datos, 'fechaAdjudicacion');
    const campos = {
      numero: numeroLote,
      fila: texto(datos, 'fila') || null,
      predioId,
      adjudicatarioId,
      fechaAdjudicacion: fechaTexto ? new Date(`${fechaTexto}T00:00:00`) : null,
    };

    if (id) await prisma.lote.update({ where: { id }, data: campos });
    else await prisma.lote.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarLote');
  }
}

/**
 * Permiso de estadía para terceros.
 *
 * Lo pide el adjudicatario y lo aprueba Secretaría. Los nombres van declarados uno por
 * línea porque es exactamente lo que la portería va a buscar cuando esa gente llegue.
 */
export async function pedirAutorizacion(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('panel_socio');

    const loteId = texto(datos, 'loteId');
    const lote = await prisma.lote.findUnique({
      where: { id: loteId },
      include: { adjudicatario: { select: { personaId: true } } },
    });
    if (!lote) return fallo('El lote no existe.');
    if (lote.adjudicatario?.personaId !== sesion.personaId) {
      return fallo('Esa vivienda no es tuya.');
    }

    const personas = texto(datos, 'personas')
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    if (personas.length === 0) {
      return fallo('Declará los nombres de quienes van a usar la vivienda: sin eso la portería no los deja pasar (art. 10).');
    }

    const desde = new Date(`${texto(datos, 'desde')}T00:00:00`);
    const hasta = new Date(`${texto(datos, 'hasta')}T23:59:59`);
    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
      return fallo('Indicá desde y hasta cuándo.');
    }
    if (hasta < desde) return fallo('La fecha de fin no puede ser anterior a la de inicio.');

    const dias = Math.ceil((hasta.getTime() - desde.getTime()) / 86_400_000);
    if (dias > DIAS_MAXIMOS_ESTADIA) {
      return fallo(
        `El préstamo no puede pasar los ${DIAS_MAXIMOS_ESTADIA} días (art. 10). Estás pidiendo ${dias}.`,
      );
    }

    await prisma.autorizacionEstadia.create({
      data: { loteId, personas, desde, hasta, aprobada: false },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'pedirAutorizacion');
  }
}

export async function aprobarAutorizacion(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('actos_estatutarios');
    await prisma.autorizacionEstadia.update({ where: { id }, data: { aprobada: true } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'aprobarAutorizacion');
  }
}

export async function anularAutorizacion(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('actos_estatutarios');
    await prisma.autorizacionEstadia.delete({ where: { id } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'anularAutorizacion');
  }
}

export async function registrarTransferencia(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('actos_estatutarios');

    const loteId = texto(datos, 'loteId');
    const vendedor = texto(datos, 'vendedor');
    const comprador = texto(datos, 'comprador');
    if (!vendedor || !comprador) return fallo('Poné quién transfiere y quién recibe.');

    const fechaTexto = texto(datos, 'fecha');
    const fecha = fechaTexto ? new Date(`${fechaTexto}T00:00:00`) : new Date();

    await prisma.transferenciaLote.create({
      data: {
        loteId,
        vendedor,
        comprador,
        // El reglamento mide estos derechos en cantidad de cuotas sociales, no en pesos
        // (arts. 19 y 20): así no quedan desactualizados cuando la cuota cambia.
        cuotasTransferencia: numero(datos, 'cuotasTransferencia', 0) ?? 0,
        cuotasAdjudicacion: numero(datos, 'cuotasAdjudicacion', 0) ?? 0,
        entreFamiliares: casilla(datos, 'entreFamiliares'),
        fecha,
        notas: texto(datos, 'notas') || null,
      },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'registrarTransferencia');
  }
}

// ─── Fichaje del personal ────────────────────────────────────────────────────

/**
 * Marca de entrada y salida. La usa la maestranza y cualquiera que tenga que fichar;
 * el Jefe de predio la ve en su control horario.
 */
export async function ficharse(predioId: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('fichar');

    const abierto = await prisma.fichaje.findFirst({
      where: { personaId: sesion.personaId, salida: null },
      orderBy: { entrada: 'desc' },
    });

    if (abierto) {
      await prisma.fichaje.update({ where: { id: abierto.id }, data: { salida: new Date() } });
    } else {
      if (!predioId) return fallo('Elegí en qué predio estás.');
      await prisma.fichaje.create({
        data: { personaId: sesion.personaId, predioId, entrada: new Date() },
      });
    }

    revalidatePath('/maestranza', 'layout');
    revalidatePath('/predio', 'layout');
    return EXITO;
  } catch (e) {
    return traducirError(e, 'ficharse');
  }
}
