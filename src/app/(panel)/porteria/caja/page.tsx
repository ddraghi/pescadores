import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { prediosDelRolActivo } from '@/lib/sesion';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { PanelCaja } from '@/components/panel/caja';
import { cajaAbiertaDe } from '@/lib/datos/deudores';

export default async function Pagina() {
  const sesion = await exigirCapacidad('cobrar');

  // El portero sólo puede abrir caja en los predios que tiene asignados.
  const ids = prediosDelRolActivo(sesion);
  const [caja, predios] = await Promise.all([
    cajaAbiertaDe(sesion.personaId),
    prisma.predio.findMany({
      where: { activo: true, ...(ids.length ? { id: { in: ids } } : {}) },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true },
    }),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi caja"
        descripcion="El turno de portería. Todo lo que cobres queda adentro hasta que la cierres con el arqueo."
      />
      <PanelCaja
        predios={predios}
        caja={
          caja
            ? {
                id: caja.id,
                predioNombre: caja.predio.nombre,
                accesoNombre: caja.acceso?.nombre ?? null,
                abiertaEn: caja.abiertaEn.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
                movimientos: caja.cobros.map((c) => ({
                  id: c.id,
                  pagador: c.pagador,
                  medioPago: c.medioPago,
                  total: Number(c.total),
                  ocurridoEn: c.ocurridoEn.toLocaleTimeString('es-AR', { timeStyle: 'short' }),
                })),
              }
            : null
        }
      />
    </>
  );
}
