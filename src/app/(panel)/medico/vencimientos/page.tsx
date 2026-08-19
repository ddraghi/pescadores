import { exigirCapacidad } from "@/lib/auth";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from "@/components/panel/tabla";
import { aptosPorVencer } from "@/lib/datos/medico";

export default async function Pagina() {
  await exigirCapacidad("emitir_apto_medico");
  const aptos = await aptosPorVencer(7);
  const hoy = new Date();

  return (
    <>
      <EncabezadoPantalla
        titulo="Aptos por vencer"
        descripcion="Los que se vencen en los próximos siete días. Sirve para avisarle al socio antes de que se lo frenen en la pileta."
      />
      <Tabla>
        <Encabezados>
          <Th className="text-right">N°</Th>
          <Th>Socio</Th>
          <Th>Vence</Th>
          <Th className="text-right">Días</Th>
        </Encabezados>
        <Filas>
          {aptos.length === 0 && <Vacio columnas={4}>Ningún apto vence esta semana.</Vacio>}
          {aptos.map((a) => {
            const dias = Math.ceil((a.hasta.getTime() - hoy.getTime()) / 86400000);
            return (
              <tr key={a.id}>
                <Td className="text-right font-mono tabular-nums text-muted-foreground">
                  {a.socio.numeroSocio}
                </Td>
                <Td className="font-medium">{a.socio.persona.nombre}</Td>
                <Td className="text-sm text-muted-foreground">{a.hasta.toISOString().slice(0, 10)}</Td>
                <Td className="text-right tabular-nums">{dias}</Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>
    </>
  );
}
