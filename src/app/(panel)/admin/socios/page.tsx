import Link from 'next/link';
import { Search } from 'lucide-react';
import { exigirCapacidad } from '@/lib/auth';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { Button } from '@/components/ui/button';
import { buscarSocios, resumenPadron } from '@/lib/datos/socios';
import { CATEGORIAS, ESTADOS, type NombreCategoria, type NombreEstado } from '@/lib/socios';

/**
 * Consulta del padrón para el Administrador General. Es de sólo lectura a propósito:
 * el estatuto pone el padrón en manos de la Secretaría (art. 43), y el Administrador
 * necesita verlo, no editarlo.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirCapacidad('ver_socios');

  const sp = await searchParams;
  const unico = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const q = unico(sp.q);
  const pagina = Number(unico(sp.pagina)) || 1;

  const [resultado, resumen] = await Promise.all([
    buscarSocios({ q, pagina }),
    resumenPadron(),
  ]);

  return (
    <>
      <EncabezadoPantalla
        titulo="Socios"
        descripcion={`${resumen.total.toLocaleString('es-AR')} en el padrón. Consulta de sólo lectura: el padrón lo administra Secretaría.`}
      />

      <form method="get" className="mb-4 flex gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre, DNI o número de socio"
            className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <Tabla>
        <Encabezados>
          <Th className="text-right">N°</Th>
          <Th>Socio</Th>
          <Th>Categoría</Th>
          <Th>Estado</Th>
          <Th>Grupo familiar</Th>
          <Th className="text-right">Antigüedad</Th>
        </Encabezados>
        <Filas>
          {resultado.socios.length === 0 && (
            <Vacio columnas={6}>
              {q ? 'Ningún socio coincide con la búsqueda.' : 'El padrón está vacío.'}
            </Vacio>
          )}
          {resultado.socios.map((s) => (
            <tr key={s.id}>
              <Td className="text-right font-mono tabular-nums text-muted-foreground">
                {s.numeroSocio}
              </Td>
              <Td>
                <div className="font-medium">{s.nombre}</div>
                <div className="font-mono text-xs text-muted-foreground">{s.dni}</div>
              </Td>
              <Td>{CATEGORIAS[s.categoria as NombreCategoria]}</Td>
              <Td>
                <Pastilla tono={s.estado === 'AL_DIA' ? 'activo' : 'neutro'}>
                  {ESTADOS[s.estado as NombreEstado]}
                </Pastilla>
              </Td>
              <Td className="text-sm text-muted-foreground">{s.grupoFamiliar ?? '—'}</Td>
              <Td className="text-right tabular-nums">{s.antiguedad} a</Td>
            </tr>
          ))}
        </Filas>
      </Tabla>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Página {resultado.pagina} de {resultado.paginas}
        </p>
        <div className="flex gap-2">
          {resultado.pagina > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?q=${encodeURIComponent(q)}&pagina=${resultado.pagina - 1}`}>Anterior</Link>
            </Button>
          )}
          {resultado.pagina < resultado.paginas && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?q=${encodeURIComponent(q)}&pagina=${resultado.pagina + 1}`}>Siguiente</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
