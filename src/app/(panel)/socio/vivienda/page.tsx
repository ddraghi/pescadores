import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { socioDeSesion } from "@/lib/datos/socio";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PedirPermiso } from "./cliente";

/** Sólo tiene sentido para los adjudicatarios del barrio de fin de semana del Nihuil. */
export default async function Pagina() {
  const sesion = await exigirCapacidad("panel_socio");
  const socio = await socioDeSesion(sesion);
  if (!socio) return <p className="text-muted-foreground">Tu ficha de socio no está cargada.</p>;

  const ahora = new Date();
  const lotes = await prisma.lote.findMany({
    where: { adjudicatarioId: socio.id },
    include: {
      predio: { select: { nombre: true } },
      autorizaciones: { orderBy: { desde: "desc" }, take: 20 },
      transferencias: { orderBy: { fecha: "desc" }, take: 5 },
    },
  });

  if (lotes.length === 0) {
    return (
      <>
        <EncabezadoPantalla titulo="Mi vivienda" />
        <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          No tenés ningún lote adjudicado en el barrio de fin de semana. Se adjudican a socios
          activos o vitalicios con dos años de antigüedad; consultá en Secretaría.
        </p>
      </>
    );
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi vivienda"
        descripcion="Tu lote en el barrio de fin de semana y los permisos para que otras personas lo usen."
      />

      <div className="flex flex-col gap-5">
        {lotes.map((l) => (
          <Card key={l.id}>
            <CardHeader>
              <CardTitle>
                Lote {l.numero}
                {l.fila && <span className="ml-2 text-sm font-normal text-muted-foreground">fila {l.fila}</span>}
              </CardTitle>
              <CardDescription>
                {l.predio.nombre}
                {l.fechaAdjudicacion && ` · adjudicado el ${l.fechaAdjudicacion.toISOString().slice(0, 10)}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <PedirPermiso loteId={l.id} numero={l.numero} />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Permisos de estadía</h3>
                <Tabla>
                  <Encabezados>
                    <Th>Quiénes</Th>
                    <Th>Cuándo</Th>
                    <Th>Estado</Th>
                  </Encabezados>
                  <Filas>
                    {l.autorizaciones.length === 0 && (
                      <Vacio columnas={3}>Todavía no pediste ninguno.</Vacio>
                    )}
                    {l.autorizaciones.map((a) => (
                      <tr key={a.id} className={a.hasta < ahora ? "opacity-60" : undefined}>
                        <Td className="text-sm">
                          {a.personas.map((p, i) => (
                            <div key={i}>{p}</div>
                          ))}
                        </Td>
                        <Td className="text-xs text-muted-foreground">
                          {a.desde.toISOString().slice(0, 10)} al {a.hasta.toISOString().slice(0, 10)}
                        </Td>
                        <Td>
                          <Pastilla tono={a.aprobada ? "activo" : a.hasta < ahora ? "inactivo" : "neutro"}>
                            {a.hasta < ahora ? "Vencido" : a.aprobada ? "Aprobado" : "Esperando aprobación"}
                          </Pastilla>
                        </Td>
                      </tr>
                    ))}
                  </Filas>
                </Tabla>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
