import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { PrediosCliente } from './cliente';

export default async function Pagina() {
  await exigirCapacidad('administrar_estructura');

  const predios = await prisma.predio.findMany({
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    include: { _count: { select: { accesos: true, alojamientos: true, espacios: true } } },
  });

  return (
    <>
      <EncabezadoPantalla
        titulo="Predios"
        descripcion="Los cinco predios del club, y los que vengan. Todo lo demás —accesos, instalaciones y actividades— cuelga de acá."
      />
      <PrediosCliente
        predios={predios.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          slug: p.slug,
          direccion: p.direccion,
          conexionSatelital: p.conexionSatelital,
          activo: p.activo,
          orden: p.orden,
          accesos: p._count.accesos,
          alojamientos: p._count.alojamientos,
          espacios: p._count.espacios,
        }))}
      />
    </>
  );
}
