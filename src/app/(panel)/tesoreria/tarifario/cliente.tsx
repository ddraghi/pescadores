'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { guardarItemTarifario, darDeBajaPrecio } from '@/lib/acciones/tesoreria';
import { CONDICIONES, CONCEPTO_CUOTA, type NombreCondicion } from '@/lib/tarifario';
import { CATEGORIAS, type NombreCategoria } from '@/lib/socios';
import { pesos } from '@/lib/utils';

export interface PredioOpcion {
  id: string;
  nombre: string;
}

export interface ItemEnLista {
  id: string;
  concepto: string;
  predioId: string | null;
  predioNombre: string | null;
  condicion: string;
  precio: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  categoriaSocio: string | null;
  porGrupoFamiliar: boolean;
  vigente: boolean;
}

/** Conceptos del tarifario real del club, para no tipearlos cada vez. */
const CONCEPTOS_SUGERIDOS = [
  CONCEPTO_CUOTA,
  'Entrada',
  'Estacionamiento',
  'Carpa',
  'Casilla rodante',
  'Bungalow',
  'Cabaña',
  'Estadía en viviendas',
  'Bajada de lancha',
  'Día de pileta',
  'Derecho de pileta',
  'Revisación de enfermería',
  'Quincho',
  'Hora adicional de quincho',
];

function CamposItem({ item, predios }: { item?: ItemEnLista; predios: PredioOpcion[] }) {
  const [concepto, setConcepto] = useState(item?.concepto ?? CONCEPTOS_SUGERIDOS[1]);
  const esCuota = concepto === CONCEPTO_CUOTA;

  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}

      <Campo etiqueta="Concepto" htmlFor="concepto">
        <Input
          id="concepto"
          name="concepto"
          list="conceptos"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          required
        />
        <datalist id="conceptos">
          {CONCEPTOS_SUGERIDOS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Campo>

      {esCuota ? (
        <>
          <Campo
            etiqueta="Categoría de socio"
            htmlFor="categoriaSocio"
            ayuda="Si una categoría no tiene precio cargado, no se le genera cuota. Así se define quién no paga."
          >
            <Selector
              id="categoriaSocio"
              name="categoriaSocio"
              defaultValue={item?.categoriaSocio ?? 'ACTIVO'}
              required
            >
              {Object.entries(CATEGORIAS).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Selector>
          </Campo>
          <Casilla
            name="porGrupoFamiliar"
            etiqueta="Es la cuota del grupo familiar"
            ayuda="La paga el titular una vez por todo el grupo, en lugar de que pague cada integrante."
            defaultChecked={item?.porGrupoFamiliar}
          />
        </>
      ) : (
        <>
          <Campo
            etiqueta="Predio"
            htmlFor="predioId"
            ayuda="Dejalo en «todos» para los conceptos que valen igual en cualquier predio."
          >
            <Selector id="predioId" name="predioId" defaultValue={item?.predioId ?? ''}>
              <option value="">Todos los predios</option>
              {predios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Selector>
          </Campo>

          <Campo etiqueta="Condición de la persona" htmlFor="condicion">
            <Selector id="condicion" name="condicion" defaultValue={item?.condicion ?? 'SOCIO'}>
              {Object.entries(CONDICIONES).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Selector>
          </Campo>
        </>
      )}

      <Campo etiqueta="Precio" htmlFor="precio" ayuda="Puede ser cero: es como se carga la entrada sin cargo del socio.">
        <Input
          id="precio"
          name="precio"
          type="number"
          min={0}
          step="0.01"
          defaultValue={item?.precio ?? ''}
          required
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Rige desde" htmlFor="vigenciaDesde">
          <Input
            id="vigenciaDesde"
            name="vigenciaDesde"
            type="date"
            defaultValue={item?.vigenciaDesde ?? new Date().toISOString().slice(0, 10)}
            required
          />
        </Campo>
        <Campo etiqueta="Hasta" htmlFor="vigenciaHasta" ayuda="Vacío: sigue vigente.">
          <Input
            id="vigenciaHasta"
            name="vigenciaHasta"
            type="date"
            defaultValue={item?.vigenciaHasta ?? ''}
          />
        </Campo>
      </div>
    </>
  );
}

export function TarifarioCliente({
  items,
  predios,
}: {
  items: ItemEnLista[];
  predios: PredioOpcion[];
}) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DialogoFormulario
          titulo="Nuevo precio"
          descripcion="Un precio vale para un concepto, un predio, una condición de persona y un período. Para aumentar, se carga uno nuevo con la fecha en que empieza a regir: el anterior queda para explicar los cobros viejos."
          accion={guardarItemTarifario}
          textoGuardar="Cargar precio"
          disparador={
            <Button>
              <Plus />
              Nuevo precio
            </Button>
          }
        >
          <CamposItem predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Concepto</Th>
          <Th>Alcance</Th>
          <Th className="text-right">Precio</Th>
          <Th>Vigencia</Th>
          <Th />
        </Encabezados>
        <Filas>
          {items.length === 0 && (
            <Vacio columnas={5}>
              El tarifario está vacío. Sin precios cargados no se pueden generar cuotas ni cobrar
              entradas.
            </Vacio>
          )}

          {items.map((i) => (
            <tr key={i.id} className={i.vigente ? undefined : 'opacity-55'}>
              <Td>
                <div className="font-medium">{i.concepto}</div>
                {i.categoriaSocio && (
                  <div className="text-xs text-muted-foreground">
                    {CATEGORIAS[i.categoriaSocio as NombreCategoria]}
                    {i.porGrupoFamiliar && ' · grupo familiar'}
                  </div>
                )}
              </Td>
              <Td className="text-sm text-muted-foreground">
                {i.concepto === CONCEPTO_CUOTA ? (
                  'Cuota social'
                ) : (
                  <>
                    {i.predioNombre ?? 'Todos los predios'}
                    <div className="text-xs">
                      {CONDICIONES[i.condicion as NombreCondicion] ?? i.condicion}
                    </div>
                  </>
                )}
              </Td>
              <Td className="text-right font-medium tabular-nums">{pesos(i.precio)}</Td>
              <Td className="text-xs text-muted-foreground">
                desde {i.vigenciaDesde}
                {i.vigenciaHasta && <div>hasta {i.vigenciaHasta}</div>}
                {!i.vigente && (
                  <Pastilla tono="inactivo">No vigente</Pastilla>
                )}
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <DialogoFormulario
                    titulo={`Editar ${i.concepto}`}
                    accion={guardarItemTarifario}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Editar ${i.concepto}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposItem item={i} predios={predios} />
                  </DialogoFormulario>
                  {i.vigente && (
                    <BotonAccion
                      accion={darDeBajaPrecio}
                      id={i.id}
                      confirmar="¿Dejar de aplicar este precio desde hoy? Se conserva para poder explicar los cobros anteriores."
                    >
                      Dar de baja
                    </BotonAccion>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
