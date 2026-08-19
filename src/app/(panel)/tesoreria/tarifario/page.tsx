import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { TarifarioCliente } from './cliente';

export default async function Pagina() {
  await exigirCapacidad('administrar_tarifario');

  const [items, predios] = await Promise.all([
    prisma.itemTarifario.findMany({
      orderBy: [{ concepto: 'asc' }, { vigenciaDesde: 'desc' }],
      include: { predio: { select: { nombre: true } } },
    }),
    prisma.predio.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true },
    }),
  ]);

  const hoy = new Date();

  return (
    <>
      <EncabezadoPantalla
        titulo="Tarifario"
        descripcion="Cada precio vale para un concepto, un predio, una condición de persona y un período. Para aumentar se carga uno nuevo con su fecha: el viejo queda y sigue explicando los cobros anteriores."
      />
      <TarifarioCliente
        predios={predios}
        items={items.map((i) => ({
          id: i.id,
          concepto: i.concepto,
          predioId: i.predioId,
          predioNombre: i.predio?.nombre ?? null,
          condicion: i.condicion,
          precio: Number(i.precio),
          vigenciaDesde: i.vigenciaDesde.toISOString().slice(0, 10),
          vigenciaHasta: i.vigenciaHasta?.toISOString().slice(0, 10) ?? null,
          categoriaSocio: i.categoriaSocio,
          porGrupoFamiliar: i.porGrupoFamiliar,
          vigente: i.vigenciaDesde <= hoy && (!i.vigenciaHasta || i.vigenciaHasta >= hoy),
        }))}
      />
    </>
  );
}
