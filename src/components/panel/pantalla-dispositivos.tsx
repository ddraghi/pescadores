import { exigirCapacidad } from "@/lib/auth";
import { puede } from "@/lib/roles";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { dispositivosDe, prediosDe, simulando } from "@/lib/datos/dispositivos";
import { DispositivosCliente } from "@/app/(panel)/predio/dispositivos/cliente";

/**
 * Registro de interruptores. La comparten el jefe de predio, la maestranza y el portero:
 * los tres pueden accionar, pero sólo el jefe puede dar de alta y configurar.
 */
export async function PantallaDispositivos() {
  const sesion = await exigirCapacidad("operar_dispositivos");
  const [dispositivos, predios] = await Promise.all([
    dispositivosDe(sesion),
    prediosDe(sesion),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Dispositivos"
        descripcion="Los interruptores del predio: luces, bombas, riego y aberturas. El testigo muestra el estado y se toca para cambiarlo."
      />

      {simulando() && (
        <p className="mb-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-marca">
          Modo simulado: no hay aparatos conectados, así que las órdenes se aplican solas
          para poder probar la pantalla. En producción el estado lo reporta el nodo del predio.
        </p>
      )}

      <DispositivosCliente
        dispositivos={dispositivos}
        predios={predios}
        puedeAdministrar={puede(sesion.rolActivo, "administrar_predio")}
        puedeOperar
      />
    </>
  );
}
