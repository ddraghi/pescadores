import { exigirCapacidad } from "@/lib/auth";
import { puede } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { croquisDe, prediosDe } from "@/lib/datos/dispositivos";
import { CroquisCliente } from "@/app/(panel)/predio/croquis/cliente";

export async function PantallaCroquis() {
  const sesion = await exigirCapacidad("operar_dispositivos");
  const suyos = prediosDelRolActivo(sesion);

  const [croquis, predios, sinUbicar] = await Promise.all([
    croquisDe(sesion),
    prediosDe(sesion),
    prisma.dispositivo.findMany({
      where: {
        croquisId: null,
        activo: true,
        ...(suyos.length ? { predioId: { in: suyos } } : {}),
      },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, proposito: true },
    }),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Croquis"
        descripcion="Cada sector con sus dispositivos ubicados encima. El testigo se toca para encender o apagar."
      />
      <CroquisCliente
        croquis={croquis}
        sinUbicar={sinUbicar}
        predios={predios}
        puedeAdministrar={puede(sesion.rolActivo, "administrar_predio")}
      />
    </>
  );
}
