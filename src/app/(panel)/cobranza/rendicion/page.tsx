import { exigirCapacidad } from '@/lib/auth';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { PanelCaja } from '@/components/panel/caja';
import { cajaAbiertaDe, prediosActivos } from '@/lib/datos/deudores';

export default async function Pagina() {
  const sesion = await exigirCapacidad('cobrar_domicilio');
  const [caja, predios] = await Promise.all([
    cajaAbiertaDe(sesion.personaId),
    prediosActivos(),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi rendición"
        descripcion="Todo lo que cobraste en el día queda acá. Al cerrar declarás cuánto tenés de cada medio de pago y Tesorería ve si coincide."
      />
      <PanelCaja
        titulo="Mi rendición"
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
