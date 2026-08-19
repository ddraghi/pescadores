'use client';

import { useState } from 'react';
import { Check, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import {
  guardarLote, aprobarAutorizacion, anularAutorizacion, registrarTransferencia,
} from '@/lib/acciones/barrio';

export interface LoteEnLista {
  id: string;
  numero: string;
  fila: string | null;
  predioId: string;
  predioNombre: string;
  adjudicatarioId: string | null;
  adjudicatarioNombre: string | null;
  fechaAdjudicacion: string | null;
  autorizacionesVigentes: number;
}

export interface AutorizacionEnLista {
  id: string;
  lote: string;
  adjudicatario: string;
  personas: string[];
  desde: string;
  hasta: string;
  dias: number;
  aprobada: boolean;
  vencida: boolean;
}

function CamposLote({
  lote,
  predios,
  socios,
}: {
  lote?: LoteEnLista;
  predios: { id: string; nombre: string }[];
  socios: { id: string; nombre: string; numeroSocio: number }[];
}) {
  return (
    <>
      {lote && <input type="hidden" name="id" value={lote.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Número de lote" htmlFor="numero">
          <Input id="numero" name="numero" defaultValue={lote?.numero} required autoFocus />
        </Campo>
        <Campo etiqueta="Fila" htmlFor="fila" ayuda="El reglamento mide los derechos por fila.">
          <Input id="fila" name="fila" defaultValue={lote?.fila ?? ''} />
        </Campo>
      </div>

      <Campo etiqueta="Predio" htmlFor="predioId">
        <Selector id="predioId" name="predioId" defaultValue={lote?.predioId ?? ''} required>
          <option value="" disabled>
            Elegí el predio
          </option>
          {predios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo
        etiqueta="Adjudicatario"
        htmlFor="adjudicatarioId"
        ayuda="Socio activo o vitalicio, con dos años de antigüedad (art. 3)."
      >
        <Selector id="adjudicatarioId" name="adjudicatarioId" defaultValue={lote?.adjudicatarioId ?? ''}>
          <option value="">Sin adjudicar</option>
          {socios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.numeroSocio} · {s.nombre}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo etiqueta="Fecha de adjudicación" htmlFor="fechaAdjudicacion">
        <Input
          id="fechaAdjudicacion"
          name="fechaAdjudicacion"
          type="date"
          defaultValue={lote?.fechaAdjudicacion ?? ''}
        />
      </Campo>

      <Casilla
        name="eximirAntiguedad"
        etiqueta="Eximir el requisito de antigüedad"
        ayuda="El art. 3 inc. b permite adjudicar sin los dos años si abonó lo que fijó la comisión."
      />
    </>
  );
}

export function BarrioCliente({
  lotes,
  autorizaciones,
  predios,
  socios,
}: {
  lotes: LoteEnLista[];
  autorizaciones: AutorizacionEnLista[];
  predios: { id: string; nombre: string }[];
  socios: { id: string; nombre: string; numeroSocio: number }[];
}) {
  const [solapa, setSolapa] = useState<'lotes' | 'permisos'>('permisos');
  const pendientes = autorizaciones.filter((a) => !a.aprobada && !a.vencida);

  return (
    <>
      <div className="mb-5 flex gap-1 border-b border-border">
        <button
          onClick={() => setSolapa('permisos')}
          className={
            solapa === 'permisos'
              ? 'border-b-2 border-accent px-4 py-2 text-sm font-semibold'
              : 'border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
          }
        >
          Permisos de estadía
          {pendientes.length > 0 && (
            <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[11px] text-accent-foreground">
              {pendientes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSolapa('lotes')}
          className={
            solapa === 'lotes'
              ? 'border-b-2 border-accent px-4 py-2 text-sm font-semibold'
              : 'border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
          }
        >
          Lotes <span className="ml-1 text-xs text-muted-foreground">{lotes.length}</span>
        </button>
      </div>

      {solapa === 'permisos' ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Prestar la vivienda a terceros exige permiso con los nombres declarados y{' '}
            <strong className="text-foreground">máximo 15 días</strong>. Sin el permiso aprobado, la
            portería del Nihuil no los deja pasar (arts. 9 y 10 del reglamento).
          </p>

          <Tabla>
            <Encabezados>
              <Th>Lote</Th>
              <Th>Adjudicatario</Th>
              <Th>Quiénes</Th>
              <Th>Cuándo</Th>
              <Th>Estado</Th>
              <Th />
            </Encabezados>
            <Filas>
              {autorizaciones.length === 0 && (
                <Vacio columnas={6}>No hay permisos pedidos. Los piden los adjudicatarios desde su panel.</Vacio>
              )}
              {autorizaciones.map((a) => (
                <tr key={a.id} className={a.vencida ? 'opacity-60' : undefined}>
                  <Td className="font-medium">{a.lote}</Td>
                  <Td className="text-sm text-muted-foreground">{a.adjudicatario}</Td>
                  <Td className="text-sm">
                    {a.personas.map((p, i) => (
                      <div key={i}>{p}</div>
                    ))}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {a.desde} al {a.hasta}
                    <div>{a.dias} días</div>
                  </Td>
                  <Td>
                    <Pastilla tono={a.aprobada ? 'activo' : a.vencida ? 'inactivo' : 'neutro'}>
                      {a.vencida ? 'Vencido' : a.aprobada ? 'Aprobado' : 'A aprobar'}
                    </Pastilla>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {!a.aprobada && !a.vencida && (
                        <BotonAccion accion={aprobarAutorizacion} id={a.id}>
                          <Check className="size-3.5" />
                          Aprobar
                        </BotonAccion>
                      )}
                      <BotonAccion
                        accion={anularAutorizacion}
                        id={a.id}
                        confirmar="¿Anular este permiso?"
                      >
                        <Trash2 className="size-3.5" />
                      </BotonAccion>
                    </div>
                  </Td>
                </tr>
              ))}
            </Filas>
          </Tabla>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <DialogoFormulario
              titulo="Nuevo lote"
              descripcion="Los lotes se ceden en concesión precaria para casas de fin de semana. No se reservan: se adjudican."
              accion={guardarLote}
              textoGuardar="Crear lote"
              disparador={
                <Button>
                  <Plus />
                  Nuevo lote
                </Button>
              }
            >
              <CamposLote predios={predios} socios={socios} />
            </DialogoFormulario>
          </div>

          <Tabla>
            <Encabezados>
              <Th>Lote</Th>
              <Th>Predio</Th>
              <Th>Adjudicatario</Th>
              <Th>Desde</Th>
              <Th />
            </Encabezados>
            <Filas>
              {lotes.length === 0 && <Vacio columnas={5}>Todavía no hay lotes cargados.</Vacio>}
              {lotes.map((l) => (
                <tr key={l.id}>
                  <Td>
                    <span className="font-medium">{l.numero}</span>
                    {l.fila && <span className="ml-2 text-xs text-muted-foreground">fila {l.fila}</span>}
                  </Td>
                  <Td className="text-sm text-muted-foreground">{l.predioNombre}</Td>
                  <Td>
                    {l.adjudicatarioNombre ?? (
                      <span className="text-sm text-muted-foreground">sin adjudicar</span>
                    )}
                  </Td>
                  <Td className="text-sm text-muted-foreground">{l.fechaAdjudicacion ?? '—'}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <DialogoFormulario
                        titulo={`Editar lote ${l.numero}`}
                        accion={guardarLote}
                        disparador={
                          <Button variant="ghost" size="sm" aria-label={`Editar lote ${l.numero}`}>
                            <Pencil />
                          </Button>
                        }
                      >
                        <CamposLote lote={l} predios={predios} socios={socios} />
                      </DialogoFormulario>

                      <DialogoFormulario
                        titulo={`Transferencia del lote ${l.numero}`}
                        descripcion="Los derechos se miden en cantidad de cuotas sociales, no en pesos (arts. 19 y 20): así no quedan desactualizados cuando cambia la cuota."
                        accion={registrarTransferencia}
                        textoGuardar="Registrar"
                        disparador={
                          <Button variant="ghost" size="sm" aria-label={`Transferir lote ${l.numero}`}>
                            <Repeat />
                          </Button>
                        }
                      >
                        <input type="hidden" name="loteId" value={l.id} />
                        <div className="grid grid-cols-2 gap-3">
                          <Campo etiqueta="Transfiere" htmlFor={`v-${l.id}`}>
                            <Input
                              id={`v-${l.id}`}
                              name="vendedor"
                              defaultValue={l.adjudicatarioNombre ?? ''}
                              required
                            />
                          </Campo>
                          <Campo etiqueta="Recibe" htmlFor={`c-${l.id}`}>
                            <Input id={`c-${l.id}`} name="comprador" required />
                          </Campo>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Campo etiqueta="Cuotas de transferencia" htmlFor={`ct-${l.id}`}>
                            <Input id={`ct-${l.id}`} name="cuotasTransferencia" type="number" min={0} defaultValue={0} />
                          </Campo>
                          <Campo etiqueta="Cuotas de adjudicación" htmlFor={`ca-${l.id}`}>
                            <Input id={`ca-${l.id}`} name="cuotasAdjudicacion" type="number" min={0} defaultValue={0} />
                          </Campo>
                        </div>
                        <Campo etiqueta="Fecha" htmlFor={`f-${l.id}`}>
                          <Input
                            id={`f-${l.id}`}
                            name="fecha"
                            type="date"
                            defaultValue={new Date().toISOString().slice(0, 10)}
                          />
                        </Campo>
                        <Casilla
                          name="entreFamiliares"
                          etiqueta="Entre familiares directos"
                          ayuda="Padres a hijos y entre hermanos va sin cargo, por única vez sobre las mismas mejoras (art. 22 del anexo)."
                        />
                        <Campo etiqueta="Notas" htmlFor={`n-${l.id}`}>
                          <Input id={`n-${l.id}`} name="notas" />
                        </Campo>
                      </DialogoFormulario>
                    </div>
                  </Td>
                </tr>
              ))}
            </Filas>
          </Tabla>
        </>
      )}
    </>
  );
}
