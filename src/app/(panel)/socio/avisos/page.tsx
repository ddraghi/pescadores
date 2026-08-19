import Link from "next/link";
import { EstadoCuota } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { socioDeSesion, resumenDelSocio } from "@/lib/datos/socio";
import { prisma } from "@/lib/prisma";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { Card, CardContent } from "@/components/ui/card";
import { pesos } from "@/lib/utils";
import { nombrePeriodo } from "@/lib/tarifario";

/**
 * Avisos del socio.
 *
 * No hay todavía una tabla de notificaciones: los avisos se derivan de su situación
 * real —lo que debe, el apto por vencer, las reservas próximas—. Es menos código y no
 * puede quedar desactualizado, que es lo que suele pasar con las notificaciones
 * guardadas.
 */
export default async function Pagina() {
  const sesion = await exigirCapacidad("panel_socio");
  const socio = await socioDeSesion(sesion);
  if (!socio) return <p className="text-muted-foreground">Tu ficha de socio no está cargada.</p>;

  const resumen = await resumenDelSocio(socio.id);
  const ahora = new Date();

  const vencidas = await prisma.cuota.findMany({
    where: { socioId: socio.id, estado: { in: [EstadoCuota.PENDIENTE, EstadoCuota.VENCIDA] } },
    orderBy: { periodo: "asc" },
  });

  const avisos: { texto: string; detalle: string; href: string; urgente: boolean }[] = [];

  if (vencidas.length > 0) {
    avisos.push({
      texto: `Debés ${vencidas.length} ${vencidas.length === 1 ? "cuota" : "cuotas"}`,
      detalle: `${pesos(resumen.deuda)} — desde ${nombrePeriodo(vencidas[0].periodo)}. A las tres cuotas seguidas el club emplaza por diez días (art. 28).`,
      href: "/socio/cuota",
      urgente: vencidas.length >= 3,
    });
  }

  if (!resumen.apto?.vigente) {
    avisos.push({
      texto: "No tenés apto médico vigente",
      detalle: "Sin apto no vas a poder entrar a la pileta. Se saca en la portería y enfermería.",
      href: "/socio/apto",
      urgente: false,
    });
  } else {
    const dias = Math.ceil((new Date(resumen.apto.hasta).getTime() - ahora.getTime()) / 86400000);
    if (dias <= 5) {
      avisos.push({
        texto: `Tu apto médico vence en ${dias} ${dias === 1 ? "día" : "días"}`,
        detalle: `Vence el ${resumen.apto.hasta}. Renovalo antes de ir a la pileta.`,
        href: "/socio/apto",
        urgente: dias <= 2,
      });
    }
  }

  for (const r of resumen.proximas.slice(0, 3)) {
    avisos.push({
      texto: `Tenés reservado ${r.que}`,
      detalle: `${r.predio} · ${r.desde.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}`,
      href: "/socio/reservas",
      urgente: false,
    });
  }

  return (
    <>
      <EncabezadoPantalla titulo="Avisos" descripcion="Lo que conviene que sepas antes de venir." />

      {avisos.length === 0 ? (
        <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          No hay nada pendiente. Estás al día y con el apto vigente.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {avisos.map((a, i) => (
            <Link key={i} href={a.href}>
              <Card className={a.urgente ? "border-accent/50 bg-accent/10 transition-colors hover:bg-accent/15" : "transition-colors hover:bg-secondary"}>
                <CardContent className="p-4">
                  <div className={a.urgente ? "font-semibold text-marca" : "font-semibold"}>{a.texto}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{a.detalle}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
