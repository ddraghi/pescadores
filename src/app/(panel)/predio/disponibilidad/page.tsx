import { exigirCapacidad } from "@/lib/auth";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { GrillaOcupacion } from "@/components/panel/grilla-ocupacion";
import { ocupacion } from "@/lib/datos/ocupacion";

export default async function Pagina() {
  const sesion = await exigirCapacidad("administrar_predio");
  const o = await ocupacion({ prediosIds: prediosDelRolActivo(sesion), dias: 21 });

  return (
    <>
      <EncabezadoPantalla
        titulo="Disponibilidad"
        descripcion="Las próximas tres semanas. El cuadrado lleno es un día tomado."
      />

      <h2 className="mb-2 text-sm font-medium">Alojamiento</h2>
      <GrillaOcupacion
        desde={o.desde}
        dias={o.dias}
        filas={o.alojamientos}
        vacio="Este predio no tiene alojamientos cargados."
      />

      <h2 className="mb-2 mt-6 text-sm font-medium">Canchas y quinchos</h2>
      <GrillaOcupacion
        desde={o.desde}
        dias={o.dias}
        filas={o.espacios}
        vacio="Este predio no tiene canchas ni quinchos cargados."
      />
    </>
  );
}
