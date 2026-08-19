'use client';

import { useState } from 'react';
import { Clock, Pencil, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import {
  guardarGrupo, alternarGrupo, guardarHorarioGrupo, borrarHorarioGrupo,
  inscribirEnGrupo, quitarDelGrupo,
} from '@/lib/acciones/actividades';
import { DIAS_SEMANA } from '@/lib/dispositivos';

export interface GrupoEnLista {
  id: string;
  nombre: string;
  actividadId: string;
  actividadNombre: string;
  predioId: string | null;
  predioNombre: string | null;
  cupo: number;
  activo: boolean;
  horarios: { id: string; dia: number; hora: string; minutos: number }[];
  inscriptos: { id: string; socioId: string; nombre: string; numeroSocio: number }[];
}

export interface OpcionSimple {
  id: string;
  nombre: string;
}

function nombreDia(dia: number): string {
  return DIAS_SEMANA.find((d) => d.valor === dia)?.largo ?? '?';
}

function CamposGrupo({
  grupo,
  actividades,
  predios,
}: {
  grupo?: GrupoEnLista;
  actividades: OpcionSimple[];
  predios: OpcionSimple[];
}) {
  return (
    <>
      {grupo && <input type="hidden" name="id" value={grupo.id} />}
      <Campo etiqueta="Nombre del grupo" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={grupo?.nombre} placeholder="Infantiles martes y jueves" required autoFocus />
      </Campo>
      <Campo etiqueta="Actividad" htmlFor="actividadId">
        <Selector id="actividadId" name="actividadId" defaultValue={grupo?.actividadId ?? ''} required>
          <option value="" disabled>
            Elegí la actividad
          </option>
          {actividades.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Predio" htmlFor="predioId">
        <Selector id="predioId" name="predioId" defaultValue={grupo?.predioId ?? ''}>
          <option value="">Sin especificar</option>
          {predios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Cupo" htmlFor="cupo" ayuda="Cero significa sin límite.">
        <Input id="cupo" name="cupo" type="number" min={0} defaultValue={grupo?.cupo ?? 0} />
      </Campo>
    </>
  );
}

function Horarios({ grupo }: { grupo: GrupoEnLista }) {
  return (
    <DialogoFormulario
      titulo={`Horarios de ${grupo.nombre}`}
      accion={guardarHorarioGrupo}
      textoGuardar="Agregar"
      disparador={
        <Button variant="ghost" size="sm" aria-label={`Horarios de ${grupo.nombre}`}>
          <Clock />
          {grupo.horarios.length > 0 && <span className="text-xs">{grupo.horarios.length}</span>}
        </Button>
      }
    >
      <input type="hidden" name="grupoId" value={grupo.id} />

      {grupo.horarios.length > 0 && (
        <div className="divide-y divide-border rounded-md border border-border">
          {grupo.horarios.map((h) => (
            <div key={h.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="flex-1 capitalize">{nombreDia(h.dia)}</span>
              <span className="font-mono tabular-nums">{h.hora}</span>
              <span className="text-xs text-muted-foreground">{h.minutos} min</span>
              <BotonAccion accion={borrarHorarioGrupo} id={h.id} confirmar="¿Borrar este horario?">
                <Trash2 className="size-3.5" />
              </BotonAccion>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Campo etiqueta="Día" htmlFor={`dia-${grupo.id}`}>
          <Selector id={`dia-${grupo.id}`} name="dia" defaultValue="2" required>
            {DIAS_SEMANA.map((d) => (
              <option key={d.valor} value={d.valor} className="capitalize">
                {d.largo}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Hora" htmlFor={`hora-${grupo.id}`}>
          <Input id={`hora-${grupo.id}`} name="hora" type="time" defaultValue="18:00" required />
        </Campo>
        <Campo etiqueta="Minutos" htmlFor={`min-${grupo.id}`}>
          <Input id={`min-${grupo.id}`} name="minutos" type="number" min={15} step={15} defaultValue={60} />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

function Alumnos({ grupo, socios }: { grupo: GrupoEnLista; socios: { id: string; nombre: string; numeroSocio: number }[] }) {
  const [busqueda, setBusqueda] = useState('');
  const yaEstan = new Set(grupo.inscriptos.map((i) => i.socioId));
  const candidatos = socios
    .filter((s) => !yaEstan.has(s.id))
    .filter((s) =>
      busqueda.length < 2
        ? false
        : s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          String(s.numeroSocio).startsWith(busqueda),
    )
    .slice(0, 8);

  return (
    <DialogoFormulario
      titulo={`Alumnos de ${grupo.nombre}`}
      descripcion={grupo.cupo > 0 ? `${grupo.inscriptos.length} de ${grupo.cupo} lugares.` : undefined}
      accion={inscribirEnGrupo}
      textoGuardar="Inscribir"
      disparador={
        <Button variant="ghost" size="sm" aria-label={`Alumnos de ${grupo.nombre}`}>
          <UserPlus />
          <span className="text-xs tabular-nums">{grupo.inscriptos.length}</span>
        </Button>
      }
    >
      <input type="hidden" name="grupoId" value={grupo.id} />

      {grupo.inscriptos.length > 0 && (
        <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {grupo.inscriptos.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{i.numeroSocio}</span>
              <span className="flex-1">{i.nombre}</span>
              <BotonAccion accion={quitarDelGrupo} id={i.id} confirmar={`¿Sacar a ${i.nombre} del grupo?`}>
                <UserMinus className="size-3.5" />
              </BotonAccion>
            </div>
          ))}
        </div>
      )}

      <Campo etiqueta="Buscar socio" htmlFor={`b-${grupo.id}`} ayuda="Por nombre o número.">
        <Input
          id={`b-${grupo.id}`}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Pérez"
        />
      </Campo>

      {candidatos.length > 0 && (
        <Campo etiqueta="Inscribir a" htmlFor={`s-${grupo.id}`}>
          <Selector id={`s-${grupo.id}`} name="socioId" required>
            {candidatos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.numeroSocio} · {s.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
      )}
    </DialogoFormulario>
  );
}

export function GruposCliente({
  grupos,
  actividades,
  predios,
  socios,
}: {
  grupos: GrupoEnLista[];
  actividades: OpcionSimple[];
  predios: OpcionSimple[];
  socios: { id: string; nombre: string; numeroSocio: number }[];
}) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DialogoFormulario
          titulo="Nuevo grupo"
          descripcion="Un grupo tuyo dentro de una actividad del club."
          accion={guardarGrupo}
          textoGuardar="Crear grupo"
          disparador={
            <Button disabled={actividades.length === 0}>
              <Plus />
              Nuevo grupo
            </Button>
          }
        >
          <CamposGrupo actividades={actividades} predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Grupo</Th>
          <Th>Actividad</Th>
          <Th>Horarios</Th>
          <Th className="text-right">Alumnos</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {grupos.length === 0 && (
            <Vacio columnas={6}>
              Todavía no armaste ningún grupo. Las actividades las carga Secretaría; los grupos,
              vos.
            </Vacio>
          )}
          {grupos.map((g) => (
            <tr key={g.id} className={g.activo ? undefined : 'opacity-60'}>
              <Td>
                <div className="font-medium">{g.nombre}</div>
                {g.predioNombre && (
                  <div className="text-xs text-muted-foreground">{g.predioNombre}</div>
                )}
              </Td>
              <Td className="text-sm text-muted-foreground">{g.actividadNombre}</Td>
              <Td className="text-xs text-muted-foreground">
                {g.horarios.length === 0
                  ? '—'
                  : g.horarios.map((h) => (
                      <div key={h.id} className="whitespace-nowrap capitalize">
                        {nombreDia(h.dia).slice(0, 3)} {h.hora}
                      </div>
                    ))}
              </Td>
              <Td className="text-right tabular-nums">
                {g.inscriptos.length}
                {g.cupo > 0 && <span className="text-muted-foreground"> / {g.cupo}</span>}
              </Td>
              <Td>
                <Pastilla tono={g.activo ? 'activo' : 'inactivo'}>
                  {g.activo ? 'Activo' : 'Cerrado'}
                </Pastilla>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-0.5">
                  <Horarios grupo={g} />
                  <Alumnos grupo={g} socios={socios} />
                  <DialogoFormulario
                    titulo={`Editar ${g.nombre}`}
                    accion={guardarGrupo}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Editar ${g.nombre}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposGrupo grupo={g} actividades={actividades} predios={predios} />
                  </DialogoFormulario>
                  <BotonAccion accion={alternarGrupo} id={g.id}>
                    {g.activo ? 'Cerrar' : 'Reabrir'}
                  </BotonAccion>
                </div>
              </Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </>
  );
}
