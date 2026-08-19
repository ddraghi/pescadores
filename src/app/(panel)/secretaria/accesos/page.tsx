import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { AccesosCliente } from './cliente';

export default async function Pagina() {
  await exigirCapacidad('administrar_estructura');

  const [accesos, predios, dispositivos] = await Promise.all([
    prisma.acceso.findMany({
      orderBy: [{ predio: { orden: 'asc' } }, { tipo: 'asc' }, { nombre: 'asc' }],
      include: {
        predio: { select: { nombre: true, conexionSatelital: true } },
        dispositivo: { select: { nombre: true, via: true } },
      },
    }),
    prisma.predio.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, conexionSatelital: true },
    }),
    prisma.dispositivo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, predioId: true, via: true },
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
        dispositivos={dispositivos}
        accesos={accesos.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
          predioId: a.predioId,
          predioNombre: a.predio.nombre,
          dispositivoId: a.dispositivoId,
          dispositivoNombre: a.dispositivo?.nombre ?? null,
          dispositivoVia: a.dispositivo?.via ?? null,
          exigeAptoMedico: a.exigeAptoMedico,
          exigeDerecho: a.exigeDerecho,
          activo: a.activo,
        }))}
      />
    </>
  );
}
