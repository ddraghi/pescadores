'use server';

/**
 * Tesorería: tarifario, cuotas, cobros, cajas y egresos.
 *
 * Dos reglas atraviesan todo el archivo:
 *
 *  - **Nada se decide en el código que pueda decidirse cargando un precio.** Si una
 *    categoría no tiene cuota cargada, no se le genera cuota. El club decide con el
 *    tarifario, no nosotros con un `if`.
 *  - **Todo cobro lleva `claveUnica`.** Es lo que impide que un reintento sobre un
 *    enlace inestable —Starlink en tres de los cinco predios— cobre dos veces.
 */

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  CategoriaSocio, CondicionPersona, EstadoCaja, EstadoCuota, EstadoSocio, MedioPago, Prisma,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { casilla, fallo, numero, texto, traducirError, EXITO } from '@/lib/acciones/comun';
import { CONCEPTO_CUOTA, nombrePeriodo, type ItemPrecio } from '@/lib/tarifario';
import { calcularCuotasDelPeriodo } from '@/lib/cuotas';

type Resp = { ok: true } | { ok: false; error: string };

/** Cuotas consecutivas impagas que disparan el emplazamiento (art. 28). */
const CUOTAS_PARA_EMPLAZAR = 3;

function refrescar() {
  revalidatePath('/tesoreria', 'layout');
  revalidatePath('/cobranza', 'layout');
  revalidatePath('/secretaria', 'layout');
  revalidatePath('/admin', 'layout');
}

function fecha(datos: FormData, campo: string): Date | null {
  const v = texto(datos, campo);
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Tarifario ───────────────────────────────────────────────────────────────

export async function guardarItemTarifario(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_tarifario');

    const id = texto(datos, 'id');
    const concepto = texto(datos, 'concepto');
    const precio = numero(datos, 'precio');
    const desde = fecha(datos, 'vigenciaDesde');

    if (!concepto) return fallo('El concepto es obligatorio.');
    if (precio === null || precio < 0) return fallo('Poné un precio válido. Puede ser cero.');
    if (!desde) return fallo('Indicá desde cuándo rige este precio.');

    const categoriaSocio = texto(datos, 'categoriaSocio');
    const esCuota = concepto === CONCEPTO_CUOTA;
    if (esCuota && !categoriaSocio) {
      return fallo('La cuota social se carga por categoría de socio: elegí cuál.');
    }

    const campos = {
      concepto,
      predioId: texto(datos, 'predioId') || null,
      condicion: (texto(datos, 'condicion') as CondicionPersona) || CondicionPersona.SOCIO,
      precio: new Prisma.Decimal(precio),
      vigenciaDesde: desde,
      vigenciaHasta: fecha(datos, 'vigenciaHasta'),
      categoriaSocio: categoriaSocio ? (categoriaSocio as CategoriaSocio) : null,
      porGrupoFamiliar: casilla(datos, 'porGrupoFamiliar'),
    };

    if (id) await prisma.itemTarifario.update({ where: { id }, data: campos });
    else await prisma.itemTarifario.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarItemTarifario');
  }
}

/**
 * Da de baja un precio poniéndole fecha de fin, en vez de borrarlo: los cobros viejos
 * se hicieron con ese precio y el historial tiene que poder explicarse.
 */
export async function darDeBajaPrecio(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_tarifario');
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    await prisma.itemTarifario.update({ where: { id }, data: { vigenciaHasta: ayer } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'darDeBajaPrecio');
  }
}

// ─── Cuotas ──────────────────────────────────────────────────────────────────

/**
 * Genera las cuotas de un período.
 *
 * Quién paga sale del tarifario: si una categoría no tiene precio cargado, no se le
 * genera nada. Se saltean los socios en licencia (art. 25, están eximidos), los cesantes
 * y los expulsados. En un grupo familiar paga el titular por todos.
 */
export async function generarCuotas(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_cuotas');

    const periodo = texto(datos, 'periodo');
    if (!/^\d{4}-\d{2}$/.test(periodo)) return fallo('El período va como 2026-08.');

    const vencimiento = fecha(datos, 'vencimiento');
    if (!vencimiento) return fallo('Indicá la fecha de vencimiento.');

    const [anio, mes] = periodo.split('-').map(Number);
    const primerDia = new Date(anio, mes - 1, 1);

    const items = (await prisma.itemTarifario.findMany({
      where: { concepto: CONCEPTO_CUOTA },
    })).map<ItemPrecio>((i) => ({
      id: i.id,
      concepto: i.concepto,
      predioId: i.predioId,
      condicion: i.condicion,
      precio: Number(i.precio),
      vigenciaDesde: i.vigenciaDesde,
      vigenciaHasta: i.vigenciaHasta,
      categoriaSocio: i.categoriaSocio,
      porGrupoFamiliar: i.porGrupoFamiliar,
    }));

    if (items.length === 0) {
      return fallo('Todavía no hay ninguna cuota social cargada en el tarifario.');
    }

    const socios = await prisma.socio.findMany({
      select: { id: true, categoria: true, estado: true, grupoFamiliarId: true, esTitular: true },
    });

    // Quién paga y cuánto se decide en `calcularCuotasDelPeriodo`, que es una función
    // pura y está probada con `npm run probar:cuotas`.
    const { cuotas } = calcularCuotasDelPeriodo(socios, items, { primerDiaDelPeriodo: primerDia });

    const nuevas = cuotas.map((c) => ({
      socioId: c.socioId,
      periodo,
      monto: new Prisma.Decimal(c.monto),
      vencimiento,
      concepto: c.concepto,
    }));

    if (nuevas.length === 0) {
      return fallo('Ningún socio quedó alcanzado. Revisá los precios cargados en el tarifario.');
    }

    // `skipDuplicates` hace que volver a generar el mismo período sea inofensivo: las
    // que ya existen quedan como están, con lo que se les haya cobrado.
    const { count } = await prisma.cuota.createMany({ data: nuevas, skipDuplicates: true });

    refrescar();
    if (count === 0) {
      return fallo(`Las cuotas de ${nombrePeriodo(periodo)} ya estaban generadas.`);
    }
    return EXITO;
  } catch (e) {
    return traducirError(e, 'generarCuotas');
  }
}

/**
 * Recalcula la morosidad de todo el padrón según el art. 28: tres cuotas consecutivas
 * impagas emplazan al socio, y a partir de ahí la comisión puede declararlo cesante.
 *
 * No declara cesante a nadie: eso lo resuelve la comisión, no un proceso automático.
 */
export async function recalcularMorosidad(): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_cuotas');
    const hoy = new Date();

    const socios = await prisma.socio.findMany({
      where: { estado: { in: [EstadoSocio.AL_DIA, EstadoSocio.MOROSO, EstadoSocio.EMPLAZADO] } },
      select: {
        id: true,
        estado: true,
        cuotas: {
          where: { estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] }, vencimiento: { lt: hoy } },
          select: { id: true },
        },
      },
    });

    const cambios: Prisma.PrismaPromise<unknown>[] = [];
    for (const s of socios) {
      const impagas = s.cuotas.length;
      const deberia =
        impagas >= CUOTAS_PARA_EMPLAZAR ? EstadoSocio.EMPLAZADO
        : impagas > 0 ? EstadoSocio.MOROSO
        : EstadoSocio.AL_DIA;

      if (deberia !== s.estado) {
        cambios.push(prisma.socio.update({ where: { id: s.id }, data: { estado: deberia } }));
        cambios.push(
          prisma.actoEstatutario.create({
            data: {
              socioId: s.id,
              tipo: 'ESTADO',
              desde: s.estado,
              hasta: deberia,
              motivo:
                deberia === EstadoSocio.EMPLAZADO
                  ? `${impagas} cuotas impagas: emplazado por diez días (art. 28)`
                  : deberia === EstadoSocio.MOROSO
                    ? `${impagas} cuota(s) impaga(s)`
                    : 'Regularizó su situación',
            },
          }),
        );
      }
    }

    // Las vencidas quedan marcadas como tales, para que el listado no dependa de la fecha.
    cambios.push(
      prisma.cuota.updateMany({
        where: { estado: EstadoCuota.PENDIENTE, vencimiento: { lt: hoy } },
        data: { estado: EstadoCuota.VENCIDA },
      }),
    );

    await prisma.$transaction(cambios);
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'recalcularMorosidad');
  }
}

export async function condonarCuota(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_cuotas');
    await prisma.cuota.update({ where: { id }, data: { estado: EstadoCuota.CONDONADA } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'condonarCuota');
  }
}

// ─── Cobros ──────────────────────────────────────────────────────────────────

/**
 * Cobra una o más cuotas de un socio.
 *
 * Si con esto no le queda ninguna cuota vencida, vuelve solo a «al día» y queda la
 * constancia del acto: es la regularización del art. 28.
 */
export async function cobrarCuotas(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('cobrar');

    const ids = datos.getAll('cuotas').filter((v): v is string => typeof v === 'string');
    if (ids.length === 0) return fallo('Elegí al menos una cuota.');

    const medioPago = texto(datos, 'medioPago') as MedioPago;
    if (!Object.values(MedioPago).includes(medioPago)) return fallo('Elegí el medio de pago.');

    const cuotas = await prisma.cuota.findMany({
      where: { id: { in: ids } },
      include: { socio: { include: { persona: { select: { nombre: true } } } } },
    });
    if (cuotas.length === 0) return fallo('Las cuotas ya no existen.');

    const yaPagas = cuotas.filter((c) => c.estado === EstadoCuota.PAGADA);
    if (yaPagas.length > 0) {
      return fallo(`La cuota de ${nombrePeriodo(yaPagas[0].periodo)} ya estaba cobrada.`);
    }

    const socioIds = new Set(cuotas.map((c) => c.socioId));
    if (socioIds.size > 1) return fallo('Las cuotas tienen que ser de un mismo socio.');

    const socio = cuotas[0].socio;
    const total = cuotas.reduce((suma, c) => suma.add(c.monto), new Prisma.Decimal(0));

    // Se adjunta a la caja abierta de quien cobra, si tiene una.
    const caja = await prisma.caja.findFirst({
      where: { personaId: sesion.personaId, estado: EstadoCaja.ABIERTA },
      select: { id: true, predioId: true },
    });

    const predioId = caja?.predioId ?? texto(datos, 'predioId');
    if (!predioId) {
      return fallo('Abrí una caja antes de cobrar, o indicá en qué predio se cobra.');
    }

    const ahora = new Date();

    await prisma.$transaction(async (tx) => {
      const cobro = await tx.cobro.create({
        data: {
          claveUnica: randomUUID(),
          socioId: socio.id,
          pagador: socio.persona.nombre,
          predioId,
          cajaId: caja?.id ?? null,
          operadorId: sesion.personaId,
          medioPago,
          total,
          items: cuotas.map((c) => ({
            concepto: c.concepto,
            periodo: c.periodo,
            cuotaId: c.id,
            importe: Number(c.monto),
          })),
          ocurridoEn: ahora,
        },
      });

      await tx.cuota.updateMany({
        where: { id: { in: cuotas.map((c) => c.id) } },
        data: { estado: EstadoCuota.PAGADA, cobroId: cobro.id, pagadaEn: ahora },
      });

      const quedanVencidas = await tx.cuota.count({
        where: {
          socioId: socio.id,
          estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] },
          vencimiento: { lt: ahora },
        },
      });

      if (
        quedanVencidas === 0 &&
        (socio.estado === EstadoSocio.MOROSO || socio.estado === EstadoSocio.EMPLAZADO)
      ) {
        await tx.socio.update({ where: { id: socio.id }, data: { estado: EstadoSocio.AL_DIA } });
        await tx.actoEstatutario.create({
          data: {
            socioId: socio.id,
            tipo: 'ESTADO',
            desde: socio.estado,
            hasta: EstadoSocio.AL_DIA,
            motivo: 'Regularizó el pago de sus cuotas',
            registradoPorId: sesion.personaId,
          },
        });
      }
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'cobrarCuotas');
  }
}

export async function asignarCobrador(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_cuotas');
    const socioId = texto(datos, 'socioId');
    const cobradorId = texto(datos, 'cobradorId') || null;
    await prisma.socio.update({ where: { id: socioId }, data: { cobradorId } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'asignarCobrador');
  }
}

// ─── Cajas ───────────────────────────────────────────────────────────────────

export async function abrirCaja(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('cobrar');

    const abierta = await prisma.caja.findFirst({
      where: { personaId: sesion.personaId, estado: EstadoCaja.ABIERTA },
    });
    if (abierta) return fallo('Ya tenés una caja abierta. Cerrala antes de abrir otra.');

    const predioId = texto(datos, 'predioId');
    if (!predioId) return fallo('Elegí en qué predio abrís la caja.');

    await prisma.caja.create({
      data: { personaId: sesion.personaId, predioId, accesoId: texto(datos, 'accesoId') || null },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'abrirCaja');
  }
}

/**
 * Cierra la caja con arqueo. Se guarda lo declarado junto a lo registrado, sin corregir
 * ninguno de los dos: la diferencia ES el dato que Tesorería necesita ver.
 */
export async function cerrarCaja(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    const sesion = await exigirCapacidadApi('cobrar');

    const cajaId = texto(datos, 'cajaId');
    const caja = await prisma.caja.findUnique({
      where: { id: cajaId },
      include: { cobros: { select: { medioPago: true, total: true } } },
    });
    if (!caja) return fallo('La caja no existe.');
    if (caja.estado === EstadoCaja.CERRADA) return fallo('Esa caja ya está cerrada.');
    if (caja.personaId !== sesion.personaId) {
      return fallo('Sólo puede cerrar la caja quien la abrió.');
    }

    const registrado: Record<string, number> = {};
    for (const c of caja.cobros) {
      registrado[c.medioPago] = (registrado[c.medioPago] ?? 0) + Number(c.total);
    }

    const declarado: Record<string, number> = {};
    for (const medio of Object.values(MedioPago)) {
      const v = numero(datos, `declarado_${medio}`, 0) ?? 0;
      if (v !== 0 || registrado[medio]) declarado[medio] = v;
    }

    const diferencias: Record<string, number> = {};
    for (const medio of new Set([...Object.keys(registrado), ...Object.keys(declarado)])) {
      diferencias[medio] = (declarado[medio] ?? 0) - (registrado[medio] ?? 0);
    }

    await prisma.caja.update({
      where: { id: cajaId },
      data: {
        estado: EstadoCaja.CERRADA,
        cerradaEn: new Date(),
        arqueo: { registrado, declarado, diferencias, observaciones: texto(datos, 'observaciones') },
      },
    });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'cerrarCaja');
  }
}

// ─── Egresos ─────────────────────────────────────────────────────────────────

export async function guardarEgreso(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_egresos');

    const id = texto(datos, 'id');
    const concepto = texto(datos, 'concepto');
    const monto = numero(datos, 'monto');
    const cuando = fecha(datos, 'fecha');

    if (!concepto) return fallo('El concepto es obligatorio.');
    if (monto === null || monto <= 0) return fallo('Poné un monto mayor a cero.');
    if (!cuando) return fallo('Indicá la fecha.');

    const campos = {
      concepto,
      monto: new Prisma.Decimal(monto),
      fecha: cuando,
      predioId: texto(datos, 'predioId') || null,
      comprobante: texto(datos, 'comprobante') || null,
    };

    if (id) await prisma.egreso.update({ where: { id }, data: campos });
    else await prisma.egreso.create({ data: campos });

    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'guardarEgreso');
  }
}

export async function eliminarEgreso(id: string): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_egresos');
    await prisma.egreso.delete({ where: { id } });
    refrescar();
    return EXITO;
  } catch (e) {
    return traducirError(e, 'eliminarEgreso');
  }
}
