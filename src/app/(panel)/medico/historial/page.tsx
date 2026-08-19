import { exigirCapacidad } from "@/lib/auth";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";
import { historialDeAptos } from "@/lib/datos/medico";

export default async function Pagina() {
  await exigirCapacidad("emitir_apto_medico");
  const aptos = await historialDeAptos();
  const hoy = new Date();

  return (
    <>
      <EncabezadoPantalla
        titulo="Historial de revisaciones"
        descripcion="Cada apto queda firmado por el médico que lo emitió, con su fecha y sus novedades."
      />
      <Tabla>
        <Encabezados>
          <Th>Fecha</Th>
          <Th>Socio</Th>
          <Th>Resultado</Th>
          <Th>Vigencia</Th>
          <Th>Novedades</Th>
          <Th>Médico</Th>
        </Encabezados>
        <Filas>
          {aptos.length === 0 && <Vacio columnas={6}>Todavía no se registró ninguna revisación.</Vacio>}
          {aptos.map((a) => (
            <tr key={a.id}>
              <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {a.creadoEn.toLocaleDateString("es-AR")}
              </Td>
              <Td className="font-medium">{a.socio.persona.nombre}</Td>
              <Td>
                <Pastilla tono={a.autorizado ? "activo" : "inactivo"}>
                  {a.autorizado ? "Autorizado" : "No autorizado"}
                </Pastilla>
              </Td>
              <Td className="text-sm text-muted-foreground">
                hasta {a.hasta.toISOString().slice(0, 10)}
                {a.autorizado && a.hasta < hoy && <div className="text-xs text-marca">vencido</div>}
              </Td>
              <Td className="text-sm text-muted-foreground">{a.novedades ?? "—"}</Td>
              <Td className="text-sm text-muted-foreground">{a.emisor?.nombre ?? "—"}</Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
