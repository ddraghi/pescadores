import { exigirCapacidad } from "@/lib/auth";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { gruposDelProfesor } from "@/lib/datos/grupos";
import { DIAS_SEMANA } from "@/lib/dispositivos";

/** La semana del profesor, para saber cuándo tiene clase. */
export default async function Pagina() {
  const sesion = await exigirCapacidad("administrar_grupos");
  const grupos = (await gruposDelProfesor(sesion.personaId)).filter((g) => g.activo);

  const porDia = DIAS_SEMANA.map((d) => ({
    ...d,
    clases: grupos
      .flatMap((g) => g.horarios.filter((h) => h.dia === d.valor).map((h) => ({ ...h, grupo: g })))
      .sort((a, b) => a.hora.localeCompare(b.hora)),
  }));

  const total = porDia.reduce((s, d) => s + d.clases.length, 0);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mis horarios"
        descripcion="Tu semana. Los horarios se cargan desde cada grupo."
      />

      {total === 0 ? (
        <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          Todavía no cargaste horarios en ninguno de tus grupos.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {porDia.filter((d) => d.clases.length > 0).map((d) => (
            <div key={d.valor} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-sm font-semibold capitalize">{d.largo}</div>
              <div className="flex flex-col gap-2">
                {d.clases.map((c) => (
                  <div key={c.id} className="rounded-md bg-secondary px-3 py-2">
                    <div className="font-mono text-sm tabular-nums">{c.hora}</div>
                    <div className="text-sm font-medium">{c.grupo.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.grupo.actividadNombre} · {c.minutos} min · {c.grupo.inscriptos.length} alumnos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
