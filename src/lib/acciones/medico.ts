'use server';

/**
 * Enfermería: la cola de espera y los aptos.
 *
 * La cadena completa es: la portería cobra la revisación → el socio aparece en la cola
 * → el médico lo revisa y emite el apto con su vigencia → el punto de control de la
 * pileta lo verifica y abre. Cuatro roles tocando el mismo dato.
 */

import { revalidatePath } from 'next/cache';
import { TipoHabilitacion } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { fallo, texto, traducirError, EXITO } from '@/lib/acciones/comun';
import { DIAS_APTO_POR_DEFECTO } from '@/lib/socios';

type Resp = { ok: true } | { ok: false; error: string };

export async function emitirApto(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('emitir_apto_medico');

    const socioId = texto(datos, 'socioId');
    const autorizado = texto(datos, 'autorizado') !== 'no';
    const novedades = texto(datos, 'novedades');
    const hastaTexto = texto(datos, 'hasta');

    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      select: { id: true },
    });
    if (!socio) return fallo('El socio no existe.');

    const desde = new Date();
    let hasta: Date;
    if (hastaTexto) {
      hasta = new Date(`${hastaTexto}T23:59:59`);
      if (Number.isNaN(hasta.getTime())) return fallo('La fecha de vencimiento no es válida.');
      if (hasta < desde) return fallo('El apto no puede vencer antes de hoy.');
    } else {
      hasta = new Date(desde);
      hasta.setDate(hasta.getDate() + DIAS_APTO_POR_DEFECTO);
    }

    // Un rechazo sin explicación no le sirve a nadie: ni al socio, que no sabe qué
    // corregir, ni a quien lo atiende en la pileta.
    if (!autorizado && !novedades) {
      return fallo('Si no lo autorizás, dejá asentado el motivo.');
    }

    await prisma.habilitacion.create({
      data: {
        socioId,
        tipo: TipoHabilitacion.APTO_MEDICO,
        autorizado,
        desde,
        hasta,
        novedades: novedades || null,
        emisorId: sesion.personaId,
      },
    });

    revalidatePath('/medico', 'layout');
    revalidatePath('/control', 'layout');
    return EXITO;
  } catch (e) {
    return traducirError(e, 'emitirApto');
  }
}
