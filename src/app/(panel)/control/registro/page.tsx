import { TipoAcceso } from "@prisma/client";
import { exigirCapacidad } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prediosDelRolActivo } from "@/lib/sesion";
import { EncabezadoPantalla } from "@/components/panel/encabezado";
import { RegistroDeIngresos } from "@/components/panel/registro-ingresos";

export default async function Pagina() {
  const sesion = await exigirCapacidad("operar_control");
  const suyos = prediosDelRolActivo(sesion);

  const ingresos = await prisma.ingreso.findMany({
    where: {
      acceso: { tipo: TipoAcceso.CONTROL },
      ...(suyos.length ? { predioId: { in: suyos } } : {}),
    },
    orderBy: { ocurridoEn: "desc" },
    take: 100,
    include: { acceso: { select: { nombre: true } }, predio: { select: { nombre: true } } },
  });

  return (
    <>
      <EncabezadoPantalla
        titulo="Registro"
        descripcion="Los últimos pasos por tu puesto. Se registran también los rechazos: saber quién llegó sin apto es parte del dato."
      />
      <RegistroDeIngresos ingresos={ingresos.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        resultado: i.resultado,
        motivo: i.motivo,
        acceso: i.acceso.nombre,
        predio: i.predio.nombre,
        cuando: i.ocurridoEn.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
      }))} />
    </>
  );
}
