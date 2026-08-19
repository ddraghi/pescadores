import { TipoAcceso } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { PuestoAcceso } from "@/components/panel/puesto-acceso";
import { accesosOperables } from "@/lib/datos/accesos";

/**
 * El punto de control no cobra: puedeCobrar va en falso y con eso desaparece toda
 * referencia a plata de la pantalla. Es la única diferencia con la portería.
 */
export default async function Pagina() {
  const sesion = await exigirCapacidad("operar_control");
  const accesos = await accesosOperables(sesion, TipoAcceso.CONTROL);

  return (
    <div className="mx-auto max-w-2xl">
      <EncabezadoPantalla titulo="Control de paso" />
      <PuestoAcceso accesos={accesos} puedeCobrar={false} tieneCajaAbierta={false} />
    </div>
  );
}
