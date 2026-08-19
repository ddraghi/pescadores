import 'server-only';
import { EstadoCaja, EstadoCuota, Rol } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { DeudorEnLista } from '@/app/(panel)/tesoreria/morosos/cliente';

/**
 * Socios con cuotas impagas, con su deuda ya sumada.
 *
 * Lo usan dos pantallas: la nómina de morosos que el art. 46 inc. e le exige informar al
 * Tesorero, y la cartera de cada cobrador. La única diferencia es el filtro.
 */
export async function listarDeudores(opciones: { cobradorId?: string } = {}): Promise<DeudorEnLista[]> {
  const hoy = new Date();

  const socios = await prisma.socio.findMany({
    where: {
      ...(opciones.cobradorId ? { cobradorId: opciones.cobradorId } : {}),
      cuotas: { some: { estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] } } },
    },
    orderBy: { numeroSocio: 'asc' },
    include: {
      persona: { select: { nombre: true } },
      cobrador: { select: { id: true, nombre: true } },
      cuotas: {
        where: { estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] } },
        orderBy: { periodo: 'asc' },
      },
    },
  });

  return socios.map((s) => ({
    socioId: s.id,
    numeroSocio: s.numeroSocio,
    nombre: s.persona.nombre,
    estado: s.estado,
    deuda: s.cuotas.reduce((suma, c) => suma + Number(c.monto), 0),
    vencidas: s.cuotas.filter((c) => c.vencimiento < hoy).length,
    cobradorId: s.cobrador?.id ?? null,
    cobradorNombre: s.cobrador?.nombre ?? null,
    cuotas: s.cuotas.map((c) => ({
      id: c.id,
      periodo: c.periodo,
      concepto: c.concepto,
      monto: Number(c.monto),
      vencida: c.vencimiento < hoy,
    })),
  }));
}

export async function listarCobradores() {
  const personas = await prisma.persona.findMany({
    where: { activo: true, roles: { some: { rol: Rol.COBRADOR } } },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true },
  });
  return personas;
}

/** ¿Esta persona tiene una caja abierta ahora? Define si el cobro pide predio. */
export async function cajaAbiertaDe(personaId: string) {
  return prisma.caja.findFirst({
    where: { personaId, estado: EstadoCaja.ABIERTA },
    include: {
      predio: { select: { nombre: true } },
      acceso: { select: { nombre: true } },
      cobros: { select: { id: true, medioPago: true, total: true, pagador: true, ocurridoEn: true } },
    },
  });
}

export async function prediosActivos() {
  return prisma.predio.findMany({
    where: { activo: true },
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });
}
