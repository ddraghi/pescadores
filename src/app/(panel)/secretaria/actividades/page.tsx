import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { ActividadesCliente } from './cliente';

export default async function Pagina() {
  await exigirCapacidad('administrar_estructura');

  const [actividades, predios] = await Promise.all([
    prisma.actividad.findMany({
      orderBy: { nombre: 'asc' },
      include: { predios: { include: { predio: { select: { id: true, nombre: true, orden: true } } } } },
    }),
    prisma.predio.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true },
    }),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Actividades"
        descripcion="Lo que el club ofrece: fútbol, hockey, tenis, gimnasio, natación, colonia. Cada una con su forma de cobro y los predios donde se dicta."
      />
      <ActividadesCliente
        predios={predios}
        actividades={actividades.map((a) => {
          const ordenados = [...a.predios].sort((x, y) => x.predio.orden - y.predio.orden);
          return {
            id: a.id,
            nombre: a.nombre,
            modalidad: a.modalidad,
            activo: a.activo,
            prediosIds: ordenados.map((p) => p.predio.id),
            prediosNombres: ordenados.map((p) => p.predio.nombre),
          };
        })}
      />
    </>
  );
}
