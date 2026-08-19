import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { AccesosCliente } from './cliente';

export default async function Pagina() {
  await exigirCapacidad('administrar_estructura');

  const [accesos, predios] = await Promise.all([
    prisma.acceso.findMany({
      orderBy: [{ predio: { orden: 'asc' } }, { tipo: 'asc' }, { nombre: 'asc' }],
      include: { predio: { select: { nombre: true, conexionSatelital: true } } },
    }),
    prisma.predio.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, conexionSatelital: true },
    }),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Accesos"
        descripcion="Los puestos donde se identifica a la gente. La portería cobra y habilita; el punto de control sólo verifica que esté apta para pasar a una zona, como la pileta o la bajada de lanchas."
      />
      <AccesosCliente
        predios={predios}
        accesos={accesos.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
          predioId: a.predioId,
          predioNombre: a.predio.nombre,
          predioSatelital: a.predio.conexionSatelital,
          dispositivoTipo: a.dispositivoTipo,
          dispositivoRef: a.dispositivoRef,
          activo: a.activo,
        }))}
      />
    </>
  );
}
