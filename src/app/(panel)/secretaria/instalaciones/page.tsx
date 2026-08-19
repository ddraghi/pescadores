import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { InstalacionesCliente } from './cliente';

export default async function Pagina() {
  await exigirCapacidad('administrar_estructura');

  const [alojamientos, espacios, predios] = await Promise.all([
    prisma.alojamiento.findMany({
      orderBy: [{ predio: { orden: 'asc' } }, { nombre: 'asc' }],
      include: { predio: { select: { nombre: true } } },
    }),
    prisma.espacio.findMany({
      orderBy: [{ predio: { orden: 'asc' } }, { nombre: 'asc' }],
      include: { predio: { select: { nombre: true } } },
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
        titulo="Instalaciones"
        descripcion="Lo que se puede reservar. Van separados porque se reservan distinto: el alojamiento por noche y las canchas y quinchos por hora. La pileta no está acá — no se reserva, se controla el acceso."
      />
      <InstalacionesCliente
        predios={predios}
        alojamientos={alojamientos.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
          predioId: a.predioId,
          predioNombre: a.predio.nombre,
          capacidadBase: a.capacidadBase,
          capacidadMax: a.capacidadMax,
          modoReserva: a.modoReserva,
          activo: a.activo,
        }))}
        espacios={espacios.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          tipo: e.tipo,
          predioId: e.predioId,
          predioNombre: e.predio.nombre,
          unidad: e.unidad,
          bloqueHoras: e.bloqueHoras,
          altaDemanda: e.altaDemanda,
          ventanaCancelacionHoras: e.ventanaCancelacionHoras,
          activo: e.activo,
        }))}
      />
    </>
  );
}
