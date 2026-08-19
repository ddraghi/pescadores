'use client';

import Link from 'next/link';
import { Pencil, Plus, Search, ShieldAlert, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { CamposSocio, type GrupoOpcion } from './formulario-socio';
import { guardarSocio, cambiarEstadoSocio, cambiarCategoria } from '@/lib/acciones/socios';
import {
  CATEGORIAS,
  ESTADOS,
  AYUDA_ESTADO,
  TRANSICIONES,
  type NombreEstado,
  type NombreCategoria,
} from '@/lib/socios';
import type { SocioEnLista } from '@/lib/datos/socios';

const TONO_ESTADO: Record<NombreEstado, 'activo' | 'neutro' | 'inactivo'> = {
  AL_DIA: 'activo',
  MOROSO: 'neutro',
  EMPLAZADO: 'neutro',
  LICENCIA: 'neutro',
  SUSPENDIDO: 'inactivo',
  CESANTE: 'inactivo',
  EXPULSADO: 'inactivo',
};

function Filtros({ q, categoria, estado }: { q: string; categoria: string; estado: string }) {
  return (
    <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
      <div className="min-w-[220px] flex-1">
        <Campo etiqueta="Buscar" htmlFor="q" ayuda="Por nombre, DNI o número de socio.">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="q" name="q" defaultValue={q} className="pl-9" placeholder="Pérez, 20123456, 9768" />
          </div>
        </Campo>
      </div>

      <Campo etiqueta="Categoría" htmlFor="categoria" className="w-44">
        <Selector id="categoria" name="categoria" defaultValue={categoria}>
          <option value="">Todas</option>
          {Object.entries(CATEGORIAS).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo etiqueta="Estado" htmlFor="estado" className="w-44">
        <Selector id="estado" name="estado" defaultValue={estado}>
          <option value="">Todos</option>
          {Object.entries(ESTADOS).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
      </Campo>

      <Button type="submit" variant="outline">
        Filtrar
      </Button>
    </form>
  );
}

function CambiarEstado({ socio }: { socio: SocioEnLista }) {
  const actual = socio.estado as NombreEstado;
  const posibles = TRANSICIONES[actual];

  if (posibles.length === 0) {
    return (
      <span className="px-2 text-xs text-muted-foreground" title={AYUDA_ESTADO[actual]}>
        Sin cambios posibles
      </span>
    );
  }

  return (
    <DialogoFormulario
      titulo={`Cambiar el estado de ${socio.nombre}`}
      descripcion={`Hoy está en «${ESTADOS[actual]}». ${AYUDA_ESTADO[actual]}`}
      accion={cambiarEstadoSocio}
      textoGuardar="Registrar acto"
      disparador={
        <Button variant="ghost" size="sm" aria-label={`Cambiar el estado de ${socio.nombre}`}>
          <ShieldAlert />
        </Button>
      }
    >
      <input type="hidden" name="socioId" value={socio.id} />
      <Campo etiqueta="Nuevo estado" htmlFor={`estado-${socio.id}`}>
        <Selector id={`estado-${socio.id}`} name="estado" required defaultValue="">
          <option value="" disabled>
            Elegí el estado
          </option>
          {posibles.map((e) => (
            <option key={e} value={e}>
              {ESTADOS[e]}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo
        etiqueta="Motivo"
        htmlFor={`motivo-${socio.id}`}
        ayuda="Obligatorio para suspensión, cesantía y expulsión. Queda como constancia del acto, con fecha y con quién lo registró."
      >
        <Input id={`motivo-${socio.id}`} name="motivo" />
      </Campo>
    </DialogoFormulario>
  );
}

function CambiarCategoria({ socio }: { socio: SocioEnLista }) {
  return (
    <DialogoFormulario
      titulo={`Cambiar la categoría de ${socio.nombre}`}
      descripcion={`Hoy es ${CATEGORIAS[socio.categoria as NombreCategoria]}, con ${socio.antiguedad} años de antigüedad.`}
      accion={cambiarCategoria}
      textoGuardar="Cambiar"
      disparador={
        <Button variant="ghost" size="sm" aria-label={`Cambiar la categoría de ${socio.nombre}`}>
          <Tags />
        </Button>
      }
    >
      <input type="hidden" name="socioId" value={socio.id} />
      <Campo etiqueta="Nueva categoría" htmlFor={`cat-${socio.id}`}>
        <Selector id={`cat-${socio.id}`} name="categoria" required defaultValue="">
          <option value="" disabled>
            Elegí la categoría
          </option>
          {Object.entries(CATEGORIAS)
            .filter(([v]) => v !== socio.categoria)
            .map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Motivo" htmlFor={`catmot-${socio.id}`}>
        <Input id={`catmot-${socio.id}`} name="motivo" placeholder="Cumplió 30 años de antigüedad" />
      </Campo>
    </DialogoFormulario>
  );
}

function Paginado({
  pagina,
  paginas,
  total,
  parametros,
}: {
  pagina: number;
  paginas: number;
  total: number;
  parametros: Record<string, string>;
}) {
  const url = (p: number) => {
    const qs = new URLSearchParams({ ...parametros, pagina: String(p) });
    return `?${qs.toString()}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        {total.toLocaleString('es-AR')} {total === 1 ? 'socio' : 'socios'} · página {pagina} de {paginas}
      </p>
      <div className="flex gap-2">
        {pagina > 1 && (
          <Button variant="outline" size="sm" asChild>
            <Link href={url(pagina - 1)}>Anterior</Link>
          </Button>
        )}
        {pagina < paginas && (
          <Button variant="outline" size="sm" asChild>
            <Link href={url(pagina + 1)}>Siguiente</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function SociosCliente({
  socios,
  grupos,
  proximoNumero,
  total,
  pagina,
  paginas,
  filtros,
  accionImportar,
}: {
  socios: SocioEnLista[];
  grupos: GrupoOpcion[];
  proximoNumero: number;
  total: number;
  pagina: number;
  paginas: number;
  filtros: { q: string; categoria: string; estado: string };
  accionImportar: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {accionImportar}
        <DialogoFormulario
          titulo="Nuevo socio"
          accion={guardarSocio}
          textoGuardar="Dar de alta"
          disparador={
            <Button>
              <Plus />
              Nuevo socio
            </Button>
          }
        >
          <CamposSocio grupos={grupos} proximoNumero={proximoNumero} />
        </DialogoFormulario>
      </div>

      <Filtros {...filtros} />

      <Tabla>
        <Encabezados>
          <Th className="text-right">N°</Th>
          <Th>Socio</Th>
          <Th>Categoría</Th>
          <Th>Estado</Th>
          <Th>Grupo familiar</Th>
          <Th className="text-right">Antigüedad</Th>
          <Th />
        </Encabezados>
        <Filas>
          {socios.length === 0 && (
            <Vacio columnas={7}>
              {filtros.q || filtros.categoria || filtros.estado
                ? 'Ningún socio coincide con la búsqueda.'
                : 'El padrón está vacío. Podés cargar socios de a uno o importar el listado completo desde un CSV.'}
            </Vacio>
          )}

          {socios.map((s) => {
            const estado = s.estado as NombreEstado;
            const vencido =
              s.permisoHasta && new Date(s.permisoHasta) < new Date() ? true : false;

            return (
              <tr key={s.id}>
                <Td className="text-right font-mono tabular-nums text-muted-foreground">
                  {s.numeroSocio}
                </Td>
                <Td>
                  <div className="font-medium">{s.nombre}</div>
                  <div className="font-mono text-xs text-muted-foreground">{s.dni}</div>
                </Td>
                <Td>
                  <div>{CATEGORIAS[s.categoria as NombreCategoria]}</div>
                  {s.permisoHasta && (
                    <div className={vencido ? 'text-xs text-marca' : 'text-xs text-muted-foreground'}>
                      {vencido ? 'Permiso vencido el ' : 'Vence el '}
                      {s.permisoHasta}
                    </div>
                  )}
                </Td>
                <Td>
                  <span title={AYUDA_ESTADO[estado]}>
                    <Pastilla tono={TONO_ESTADO[estado]}>{ESTADOS[estado]}</Pastilla>
                  </span>
                </Td>
                <Td className="text-sm text-muted-foreground">
                  {s.grupoFamiliarNombre ? (
                    <>
                      {s.grupoFamiliarNombre}
                      {s.esTitular && <span className="ml-1 text-[11px] text-marca">titular</span>}
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="text-right tabular-nums">{s.antiguedad} a</Td>
                <Td>
                  <div className="flex items-center justify-end gap-0.5">
                    <DialogoFormulario
                      titulo={`Editar a ${s.nombre}`}
                      accion={guardarSocio}
                      disparador={
                        <Button variant="ghost" size="sm" aria-label={`Editar a ${s.nombre}`}>
                          <Pencil />
                        </Button>
                      }
                    >
                      <CamposSocio socio={s} grupos={grupos} proximoNumero={proximoNumero} />
                    </DialogoFormulario>
                    <CambiarCategoria socio={s} />
                    <CambiarEstado socio={s} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </Filas>
      </Tabla>

      <Paginado
        pagina={pagina}
        paginas={paginas}
        total={total}
        parametros={{ q: filtros.q, categoria: filtros.categoria, estado: filtros.estado }}
      />
    </>
  );
}
