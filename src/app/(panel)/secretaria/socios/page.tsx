import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { buscarSocios, resumenPadron } from '@/lib/datos/socios';
import { ESTADOS, type NombreEstado } from '@/lib/socios';
import { SociosCliente } from './cliente';
import { ImportarPadron } from './importar';

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirCapacidad('administrar_socios');

  const sp = await searchParams;
  const unico = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

  const filtros = {
    q: unico(sp.q),
    categoria: unico(sp.categoria),
    estado: unico(sp.estado),
  };
  const pagina = Number(unico(sp.pagina)) || 1;

  const [resultado, resumen, mayor] = await Promise.all([
    buscarSocios({ ...filtros, pagina }),
    resumenPadron(),
    prisma.socio.aggregate({ _max: { numeroSocio: true } }),
  ]);

  const destacados: NombreEstado[] = ['AL_DIA', 'MOROSO', 'EMPLAZADO', 'LICENCIA', 'CESANTE'];

  return (
    <>
      <EncabezadoPantalla
        titulo="Padrón de socios"
        descripcion="Las seis categorías del estatuto, sus estados y sus grupos familiares. Los cambios de estado y de categoría quedan asentados con fecha y motivo."
      />

      {resumen.total > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <div className="rounded-md border border-border bg-card px-3 py-2">
            <div className="text-lg font-bold tabular-nums">
              {resumen.total.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              En el padrón
            </div>
          </div>
          {destacados
            .filter((e) => resumen.porEstado[e])
            .map((e) => (
              <div key={e} className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-lg font-bold tabular-nums">
                  {resumen.porEstado[e].toLocaleString('es-AR')}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {ESTADOS[e]}
                </div>
              </div>
            ))}
        </div>
      )}

      <SociosCliente
        socios={resultado.socios}
        proximoNumero={(mayor._max.numeroSocio ?? 0) + 1}
        total={resultado.total}
        pagina={resultado.pagina}
        paginas={resultado.paginas}
        filtros={filtros}
        accionImportar={<ImportarPadron />}
      />
    </>
  );
}
