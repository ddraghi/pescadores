import { TipoHabilitacion } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { socioDeSesion } from "@/lib/datos/socio";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";

export default async function Pagina() {
  const sesion = await exigirCapacidad("panel_socio");
  const socio = await socioDeSesion(sesion);
  if (!socio) return <p className="text-muted-foreground">Tu ficha de socio no está cargada.</p>;

  const ahora = new Date();
  const habilitaciones = await prisma.habilitacion.findMany({
    where: { socioId: socio.id },
    orderBy: { creadoEn: "desc" },
    take: 20,
    include: { emisor: { select: { nombre: true } } },
  });

  const aptos = habilitaciones.filter((h) => h.tipo === TipoHabilitacion.APTO_MEDICO);
  const derechos = habilitaciones.filter((h) => h.tipo !== TipoHabilitacion.APTO_MEDICO);
  const vigente = aptos.find((a) => a.autorizado && a.hasta >= ahora);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi apto médico"
        descripcion="Hace falta para usar la pileta. Se saca pagando la revisación en la portería y pasando por enfermería."
      />

      <div className={vigente ? "mb-5 rounded-lg border border-paso-ok bg-paso-ok/10 px-5 py-4" : "mb-5 rounded-lg border border-accent/40 bg-accent/10 px-5 py-4"}>
        <div className="text-lg font-semibold">
          {vigente ? "Estás habilitado para la pileta" : "No tenés apto vigente"}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {vigente
            ? `Vence el ${vigente.hasta.toISOString().slice(0, 10)}.`
            : "Pasá por la portería, pedí la revisación de enfermería y después por el consultorio."}
        </div>
      </div>

      {derechos.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 text-sm font-medium">Derechos de temporada</h2>
          <div className="flex flex-wrap gap-2">
            {derechos.map((d) => (
              <span key={d.id} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs">
                {d.tipo === "DERECHO_PILETA" ? "Derecho de pileta" : d.tipo}
                <span className="ml-1.5 text-muted-foreground">
                  {d.hasta >= ahora ? `hasta ${d.hasta.toISOString().slice(0, 10)}` : "vencido"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-2 text-sm font-medium">Historial de revisaciones</h2>
      <Tabla>
        <Encabezados>
          <Th>Fecha</Th>
          <Th>Resultado</Th>
          <Th>Vigencia</Th>
          <Th>Novedades</Th>
        </Encabezados>
        <Filas>
          {aptos.length === 0 && <Vacio columnas={4}>Todavía no te revisaron.</Vacio>}
          {aptos.map((a) => (
            <tr key={a.id}>
              <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {a.creadoEn.toLocaleDateString("es-AR")}
              </Td>
              <Td>
                <Pastilla tono={a.autorizado ? "activo" : "inactivo"}>
                  {a.autorizado ? "Autorizado" : "No autorizado"}
                </Pastilla>
              </Td>
              <Td className="text-sm text-muted-foreground">
                hasta {a.hasta.toISOString().slice(0, 10)}
              </Td>
              <Td className="text-sm text-muted-foreground">{a.novedades ?? "—"}</Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
