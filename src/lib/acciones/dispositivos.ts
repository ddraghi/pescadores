'use server';

/**
 * Dispositivos: registro, croquis, accionamiento y horarios.
 *
 * Dos cosas que atraviesan todo:
 *
 *  - **Las órdenes son absolutas**, nunca «invertir el estado». Si una se duplica sobre
 *    un enlace inestable, el aparato queda como tiene que quedar y no pasa nada.
 *  - **Todo accionamiento deja constancia** de quién, cuándo y desde dónde. Con bombas y
 *    riego, y tres roles con permiso para operar, eso no es opcional.
 */

import { revalidatePath } from 'next/cache';
import { EstadoDispositivo, PropositoDispositivo } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { prediosDelRolActivo } from '@/lib/sesion';
import { casilla, fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';
import { estadoVisible, muestraConexion, viaPermitida, VIAS } from '@/lib/dispositivos';

type Resp = { ok: true } | { ok: false; error: string };

const SIN_DISPOSITIVO = 'El dispositivo no existe.';
const AJENO = 'Ese dispositivo no pertenece a tu predio.';

/**
 * En desarrollo no hay aparatos: con esto encendido las órdenes se aplican solas y el
 * testigo responde, para poder ver la pantalla funcionando. En producción va apagado y
 * el estado lo reporta el nodo del predio.
 */
export async function modoSimulado(): Promise<boolean> {
  return process.env.SIMULAR_DISPOSITIVOS === 'true';
}

function refrescar() {
  revalidatePath('/predio', 'layout');
  revalidatePath('/maestranza', 'layout');
  revalidatePath('/porteria', 'layout');
  revalidatePath('/secretaria', 'layout');
}

type Hallazgo =
  | { ok: false; error: string }
  | { ok: true; dispositivo: NonNullable<Awaited<ReturnType<typeof buscarDispositivo>>> };

function buscarDispositivo(dispositivoId: string) {
  return prisma.dispositivo.findUnique({
    where: { id: dispositivoId },
    include: { predio: { select: { id: true, conexionSatelital: true, nombre: true } } },
  });
}

/**
 * El dispositivo tiene que pertenecer a un predio de quien lo toca.
 *
 * Devuelve un resultado con discriminante en vez de dos formas distintas: sin eso,
 * TypeScript no puede estrechar el tipo y el error queda como posiblemente indefinido.
 */
async function exigirPredioPropio(
  dispositivoId: string,
  prediosPropios: string[],
): Promise<Hallazgo> {
  const d = await buscarDispositivo(dispositivoId);
  if (!d) return { ok: false, error: SIN_DISPOSITIVO };
  if (prediosPropios.length > 0 && !prediosPropios.includes(d.predioId)) {
    return { ok: false, error: AJENO };
  }
  return { ok: true, dispositivo: d };
}

// ─── Registro ────────────────────────────────────────────────────────────────

export async function guardarDispositivo(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_predio');
    const propios = prediosDelRolActivo(sesion);

    const id = texto(datos, 'id');
    const nombre = texto(datos, 'nombre');
    const deviceId = texto(datos, 'deviceId');
    const predioId = texto(datos, 'predioId');
    const via = texto(datos, 'via') || 'sonoff_lan';
    const proposito = texto(datos, 'proposito') as PropositoDispositivo;

    if (!nombre) return fallo('Poné un nombre que se entienda desde el croquis.');
    if (!deviceId) return fallo('Falta el identificador del aparato en eWeLink.');
    if (!predioId) return fallo('Elegí el predio.');
    if (!(via in VIAS)) return fallo('Elegí cómo se le habla al aparato.');
    if (!Object.values(PropositoDispositivo).includes(proposito)) {
      return fallo('Elegí para qué es.');
    }
    if (propios.length > 0 && !propios.includes(predioId)) {
      return fallo('Sólo podés cargar dispositivos en tu predio.');
    }

    const predio = await prisma.predio.findUnique({
      where: { id: predioId },
      select: { conexionSatelital: true, nombre: true },
    });
    if (!predio) return fallo('El predio no existe.');

    if (!viaPermitida(via, predio.conexionSatelital)) {
      return fallo(
        `${predio.nombre} se conecta por satélite: la orden tiene que salir por la red local. Por la nube sube y baja por satélite dos veces, y tarda segundos en accionar.`,
      );
    }

    const campos = {
      nombre,
      deviceId,
      predioId,
      via,
      proposito,
      direccion: texto(datos, 'direccion') || null,
      ubicacion: texto(datos, 'ubicacion') || null,
      requiereConfirmacion: casilla(datos, 'requiereConfirmacion'),
    };

    if (id) await prisma.dispositivo.update({ where: { id }, data: campos });
    else await prisma.dispositivo.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarDispositivo');
  }
}

export async function alternarDispositivoActivo(id: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_predio');
    const r = await exigirPredioPropio(id, prediosDelRolActivo(sesion));
    if (!r.ok) return fallo(r.error);

    await prisma.dispositivo.update({
      where: { id },
      data: { activo: !r.dispositivo.activo },
    });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'alternarDispositivoActivo');
  }
}

// ─── Accionamiento ───────────────────────────────────────────────────────────

/**
 * Enciende o apaga. Lo pueden hacer el jefe de predio, la maestranza y el portero.
 *
 * Se rechaza si el estado que se ve está viejo: preferimos no poder operar antes que
 * operar a ciegas sobre una bomba.
 */
export async function accionar(dispositivoId: string, encender: boolean): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('operar_dispositivos');
    const r = await exigirPredioPropio(dispositivoId, prediosDelRolActivo(sesion));
    if (!r.ok) return fallo(r.error);

    const d = r.dispositivo;
    if (!d.activo) return fallo('El dispositivo está dado de baja.');

    // Los de acceso no se alternan desde el croquis: trabajan por pulso y se abren
    // desde la pantalla de la portería, donde además queda registrado quién pasó.
    if (muestraConexion(d.proposito)) {
      return fallo(
        'Los accesos se abren desde la pantalla de la portería o del punto de control, no desde el croquis: así queda registrado quién pasó.',
      );
    }

    const simulado = process.env.SIMULAR_DISPOSITIVOS === 'true';
    const visible = estadoVisible(d.estado, d.estadoEn, { simulado });
    if (visible === 'SIN_DATO') {
      return fallo(
        'No se sabe en qué estado está: la última lectura es vieja o el nodo del predio no está reportando. No se acciona a ciegas.',
      );
    }

    await prisma.$transaction(async (tx) => {
      const accion = await tx.accionDispositivo.create({
        data: {
          dispositivoId,
          personaId: sesion.personaId,
          accion: encender ? 'ENCENDER' : 'APAGAR',
          origen: 'MANUAL',
          // Sin nodo real, la orden se da por aplicada en el acto para poder ver la
          // pantalla funcionando. Con nodo, queda pendiente hasta que él la confirme.
          aplicadaEn: simulado ? new Date() : null,
        },
      });

      if (simulado) {
        await tx.dispositivo.update({
          where: { id: dispositivoId },
          data: {
            estado: encender ? EstadoDispositivo.ENCENDIDO : EstadoDispositivo.APAGADO,
            estadoEn: new Date(),
          },
        });
      }
      return accion;
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'accionar');
  }
}

// ─── Croquis ─────────────────────────────────────────────────────────────────

export async function ubicarEnCroquis(
  dispositivoId: string,
  croquisId: string | null,
  x: number | null,
  y: number | null,
): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_predio');
    const r = await exigirPredioPropio(dispositivoId, prediosDelRolActivo(sesion));
    if (!r.ok) return fallo(r.error);

    await prisma.dispositivo.update({
      where: { id: dispositivoId },
      // Las coordenadas van en porcentaje: el croquis se ve igual en el monitor de la
      // oficina y en un celular.
      data: { croquisId, x, y },
    });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'ubicarEnCroquis');
  }
}

export async function borrarCroquis(id: string): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_predio');
    const croquis = await prisma.croquis.findUnique({ where: { id } });
    if (!croquis) return fallo('El croquis no existe.');

    const propios = prediosDelRolActivo(sesion);
    if (propios.length > 0 && !propios.includes(croquis.predioId)) {
      return fallo('Ese croquis no pertenece a tu predio.');
    }

    // Los dispositivos no se borran: se sueltan del croquis y quedan en el listado.
    await prisma.$transaction([
      prisma.dispositivo.updateMany({
        where: { croquisId: id },
        data: { croquisId: null, x: null, y: null },
      }),
      prisma.croquis.delete({ where: { id } }),
    ]);

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'borrarCroquis');
  }
}

// ─── Horarios ────────────────────────────────────────────────────────────────

export async function guardarHorario(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_predio');

    const id = texto(datos, 'id');
    const dispositivoId = texto(datos, 'dispositivoId');
    const hora = texto(datos, 'hora');
    const encender = texto(datos, 'encender') === 'si';

    if (!/^\d{2}:\d{2}$/.test(hora)) return fallo('La hora va como 06:00.');

    const r = await exigirPredioPropio(dispositivoId, prediosDelRolActivo(sesion));
    if (!r.ok) return fallo(r.error);

    const dias = datos
      .getAll('dias')
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);

    const campos = { dispositivoId, hora, encender, dias };
    if (id) await prisma.horarioDispositivo.update({ where: { id }, data: campos });
    else await prisma.horarioDispositivo.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarHorario');
  }
}

export async function borrarHorario(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_predio');
    await prisma.horarioDispositivo.delete({ where: { id } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'borrarHorario');
  }
}

/** Sube el croquis de un sector. La imagen se guarda fuera del árbol del build. */
export async function subirCroquis(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('administrar_predio');

    const predioId = texto(datos, 'predioId');
    const nombre = texto(datos, 'nombre');
    const archivo = datos.get('imagen');

    if (!nombre) return fallo('Poné un nombre al croquis, por ejemplo «Sector camping».');
    if (!predioId) return fallo('Elegí el predio.');
    if (!(archivo instanceof File) || archivo.size === 0) return fallo('Elegí una imagen.');
    if (archivo.size > 8 * 1024 * 1024) return fallo('La imagen supera los 8 MB.');
    if (!archivo.type.startsWith('image/')) return fallo('El archivo tiene que ser una imagen.');

    const propios = prediosDelRolActivo(sesion);
    if (propios.length > 0 && !propios.includes(predioId)) {
      return fallo('Sólo podés cargar croquis en tu predio.');
    }

    const { guardarImagenCroquis } = await import('@/lib/archivos');
    const guardado = await guardarImagenCroquis(archivo);

    const ultimo = await prisma.croquis.aggregate({
      where: { predioId },
      _max: { orden: true },
    });

    await prisma.croquis.create({
      data: {
        predioId,
        nombre,
        archivo: guardado,
        orden: (ultimo._max.orden ?? 0) + 1,
      },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'subirCroquis');
  }
}
