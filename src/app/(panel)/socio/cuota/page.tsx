import { EstadoCuota } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { socioDeSesion } from "@/lib/datos/socio";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from "@/components/panel/tabla";
import { ESTADOS_CUOTA, nombrePeriodo } from "@/lib/tarifario";
import { pesos } from "@/lib/utils";

export default async function Pagina() {
  const sesion = await exigirCapacidad("panel_socio");
  const socio = await socioDeSesion(sesion);
  if (!socio) return <p className="text-muted-foreground">Tu ficha de socio no está cargada.</p>;

  const cuotas = await prisma.cuota.findMany({
    where: { socioId: socio.id },
    orderBy: { periodo: "desc" },
    take: 36,
    include: { cobro: { select: { medioPago: true, ocurridoEn: true } } },
  });

  const impagas = cuotas.filter((c) => c.estado === EstadoCuota.PENDIENTE || c.estado === EstadoCuota.VENCIDA);
  const debe = impagas.reduce((s, c) => s + Number(c.monto), 0);

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi cuota"
        descripcion="Tu estado de cuenta con el club y el historial de lo que fuiste pagando."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className={debe > 0 ? "rounded-md border border-accent/40 bg-accent/10 px-4 py-3" : "rounded-md border border-border bg-card px-4 py-3"}>
          <div className="text-xl font-bold tabular-nums">{pesos(debe)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {debe > 0 ? `${impagas.length} cuota(s) por pagar` : "Estás al día"}
          </div>
        </div>
      </div>

      {debe > 0 && (
        <p className="mb-5 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Podés pagar en la portería de cualquier predio, en Tesorería, o esperar al cobrador si
          tenés uno asignado. El pago por Mercado Pago desde acá se habilita cuando el club
          conecte su cuenta.
        </p>
      )}

      <Tabla>
        <Encabezados>
          <Th>Período</Th>
          <Th>Concepto</Th>
          <Th className="text-right">Monto</Th>
          <Th>Vence</Th>
          <Th>Estado</Th>
        </Encabezados>
        <Filas>
          {cuotas.length === 0 && <Vacio columnas={5}>Todavía no tenés cuotas generadas.</Vacio>}
          {cuotas.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{nombrePeriodo(c.periodo)}</Td>
              <Td className="text-sm text-muted-foreground">{c.concepto}</Td>
              <Td className="text-right tabular-nums">{pesos(Number(c.monto))}</Td>
              <Td className="text-sm text-muted-foreground">{c.vencimiento.toISOString().slice(0, 10)}</Td>
              <Td>
                <Pastilla tono={c.estado === "PAGADA" ? "activo" : c.estado === "VENCIDA" ? "inactivo" : "neutro"}>
                  {ESTADOS_CUOTA[c.estado]}
                </Pastilla>
                {c.pagadaEn && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {c.pagadaEn.toLocaleDateString("es-AR")}
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
