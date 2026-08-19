import { exigirCapacidad } from "@/lib/auth";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { GrillaOcupacion } from "@/components/panel/grilla-ocupacion";
import { ocupacion } from "@/lib/datos/ocupacion";

/** Ocupación de parcelas y bungalows de todo el club, que es lo que pidió el cliente. */
export default async function Pagina() {
  await exigirCapacidad("ver_ocupacion");
  const o = await ocupacion({ dias: 21 });

  const hoyTomados = o.alojamientos.filter((a) => a.tomados.includes(0)).length;
  const porcentaje = o.alojamientos.length
    ? Math.round((hoyTomados / o.alojamientos.length) * 100)
    : 0;

  return (
    <>
      <EncabezadoPantalla
        titulo="Ocupación"
        descripcion="Alojamientos y espacios de los cinco predios, las próximas tres semanas."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3">
          <div className="text-xl font-bold tabular-nums">{porcentaje}%</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ocupación de hoy</div>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <div className="text-xl font-bold tabular-nums">{hoyTomados} / {o.alojamientos.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Alojamientos tomados</div>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-medium">Alojamiento</h2>
      <GrillaOcupacion desde={o.desde} dias={o.dias} filas={o.alojamientos} vacio="Sin alojamientos cargados." />

      <h2 className="mb-2 mt-6 text-sm font-medium">Canchas y quinchos</h2>
      <GrillaOcupacion desde={o.desde} dias={o.dias} filas={o.espacios} vacio="Sin canchas ni quinchos cargados." />
    </>
  );
}
