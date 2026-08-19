import { exigirCapacidad } from "@/lib/auth";
import { socioDeSesion } from "@/lib/datos/socio";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";
import { CATEGORIAS, ESTADOS, type NombreCategoria, type NombreEstado } from "@/lib/socios";

export default async function Pagina() {
  const sesion = await exigirCapacidad("panel_socio");
  const socio = await socioDeSesion(sesion);
  if (!socio) return <p className="text-muted-foreground">Tu ficha de socio no está cargada.</p>;

  const grupo = socio.grupoFamiliar;

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi grupo familiar"
        descripcion="Quiénes están incluidos. Los cambios los hace Secretaría."
      />

      {!grupo ? (
        <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          No pertenecés a ningún grupo familiar: tu cuota es individual. Si querés armar uno,
          comunicate con Secretaría.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Grupo <strong className="text-foreground">{grupo.nombre}</strong>. La cuota la paga el
            titular por todo el grupo.
          </p>
          <Tabla>
            <Encabezados>
              <Th className="text-right">N°</Th>
              <Th>Integrante</Th>
              <Th>Categoría</Th>
              <Th>Estado</Th>
            </Encabezados>
            <Filas>
              {grupo.integrantes.length === 0 && <Vacio columnas={4}>El grupo está vacío.</Vacio>}
              {grupo.integrantes.map((i) => (
                <tr key={i.id}>
                  <Td className="text-right font-mono tabular-nums text-muted-foreground">{i.numeroSocio}</Td>
                  <Td>
                    <span className="font-medium">{i.persona.nombre}</span>
                    {i.esTitular && <span className="ml-2 text-[11px] text-marca">titular</span>}
                    {i.id === socio.id && <span className="ml-2 text-[11px] text-muted-foreground">sos vos</span>}
                  </Td>
                  <Td className="text-sm text-muted-foreground">{CATEGORIAS[i.categoria as NombreCategoria]}</Td>
                  <Td>
                    <Pastilla tono={i.estado === "AL_DIA" ? "activo" : "neutro"}>
                      {ESTADOS[i.estado as NombreEstado]}
                    </Pastilla>
                  </Td>
                </tr>
              ))}
            </Filas>
          </Tabla>
        </>
      )}
    </>
  );
}
