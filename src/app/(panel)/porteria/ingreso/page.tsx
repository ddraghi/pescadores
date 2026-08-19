import { TipoAcceso } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { PuestoAcceso } from "@/components/panel/puesto-acceso";
import { accesosOperables, tieneCajaAbierta } from "@/lib/datos/accesos";

export default async function Pagina() {
  const sesion = await exigirCapacidad("operar_porteria");
  const [accesos, conCaja] = await Promise.all([
    accesosOperables(sesion, TipoAcceso.PORTERIA),
    tieneCajaAbierta(sesion.personaId),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <EncabezadoPantalla titulo="Ingreso" />
      <PuestoAcceso accesos={accesos} puedeCobrar tieneCajaAbierta={conCaja} />
    </div>
  );
}
