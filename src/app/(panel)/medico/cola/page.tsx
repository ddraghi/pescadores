import { exigirCapacidad } from "@/lib/auth";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { colaDeEnfermeria } from "@/lib/datos/medico";
import { ColaCliente } from "./cliente";

export default async function Pagina() {
  await exigirCapacidad("emitir_apto_medico");
  const cola = await colaDeEnfermeria();

  return (
    <>
      <EncabezadoPantalla
        titulo="Cola de espera"
        descripcion="Socios que pagaron la revisación y todavía no fueron revisados. La cola se arma sola con los cobros de la portería."
      />
      <ColaCliente cola={cola} />
    </>
  );
}
