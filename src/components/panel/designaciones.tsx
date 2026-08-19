'use client';

import { useState } from 'react';
import { Pencil, Plus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { guardarPersona, alternarPersona, quitarRol } from '@/lib/acciones/personas';

/** Rol que quien está mirando tiene permitido designar. Lo resuelve el servidor. */
export interface RolOpcion {
  valor: string;
  etiqueta: string;
  requierePredio: boolean;
}

export interface PredioOpcion {
  id: string;
  nombre: string;
}

export interface RolDePersona {
  id: string;
  rol: string;
  etiqueta: string;
  predioNombre: string | null;
  /** Falso cuando quien mira no tiene permiso para quitar ese rol. */
  puedeQuitarlo: boolean;
}

export interface PersonaEnLista {
  id: string;
  nombre: string;
  dni: string;
  usuario: string | null;
  activo: boolean;
  roles: RolDePersona[];
  /** Falso cuando alguno de sus roles excede lo que quien mira puede administrar. */
  administrable: boolean;
}

function CamposPersona({
  persona,
  roles,
  predios,
}: {
  persona?: PersonaEnLista;
  roles: RolOpcion[];
  predios: PredioOpcion[];
}) {
  const [rol, setRol] = useState(roles[0]?.valor ?? '');
  const requierePredio = roles.find((r) => r.valor === rol)?.requierePredio ?? false;
  const editando = Boolean(persona);

  return (
    <>
      {persona && <input type="hidden" name="id" value={persona.id} />}

      <Campo etiqueta="Nombre y apellido" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={persona?.nombre} required autoFocus />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="DNI" htmlFor="dni" ayuda="Sin puntos.">
          <Input id="dni" name="dni" inputMode="numeric" defaultValue={persona?.dni} required />
        </Campo>
        <Campo etiqueta="Usuario" htmlFor="usuario" ayuda="Con el que va a entrar.">
          <Input id="usuario" name="usuario" defaultValue={persona?.usuario ?? ''} required />
        </Campo>
      </div>

      {!editando && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Correo" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </Campo>
          <Campo etiqueta="Teléfono" htmlFor="telefono">
            <Input id="telefono" name="telefono" />
          </Campo>
        </div>
      )}

      <Campo
        etiqueta={editando ? 'Contraseña nueva' : 'Contraseña'}
        htmlFor="clave"
        ayuda={
          editando
            ? 'Dejala en blanco para no cambiarla.'
            : 'Al menos 8 caracteres. Se la comunicás a la persona para el primer ingreso.'
        }
      >
        <Input id="clave" name="clave" type="password" required={!editando} minLength={8} />
      </Campo>

      <Campo
        etiqueta={editando ? 'Agregar rol' : 'Rol'}
        htmlFor="rol"
        ayuda={editando ? 'Si ya lo tiene, no se duplica.' : undefined}
      >
        <Selector id="rol" name="rol" value={rol} onChange={(e) => setRol(e.target.value)} required>
          {roles.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </Selector>
      </Campo>

      {requierePredio && (
        <Campo etiqueta="Predio donde trabaja" htmlFor="predioId">
          <Selector id="predioId" name="predioId" required>
            <option value="">Elegí un predio</option>
            {predios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
      )}
    </>
  );
}

export function Designaciones({
  personas,
  roles,
  predios,
  vacio,
}: {
  personas: PersonaEnLista[];
  roles: RolOpcion[];
  predios: PredioOpcion[];
  vacio: string;
}) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DialogoFormulario
          titulo="Designar a alguien"
          descripcion="Se crea la persona y se le asigna el rol en un solo paso. Después puede entrar con el usuario y la contraseña que le pongas."
          accion={guardarPersona}
          textoGuardar="Designar"
          disparador={
            <Button disabled={roles.length === 0}>
              <Plus />
              Designar
            </Button>
          }
        >
          <CamposPersona roles={roles} predios={predios} />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Persona</Th>
          <Th>Usuario</Th>
          <Th>Roles</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {personas.length === 0 && <Vacio columnas={5}>{vacio}</Vacio>}

          {personas.map((p) => (
            <tr key={p.id} className={p.activo ? undefined : 'opacity-60'}>
              <Td>
                <div className="font-medium">{p.nombre}</div>
                <div className="font-mono text-xs text-muted-foreground">{p.dni}</div>
              </Td>
              <Td className="font-mono text-xs">{p.usuario ?? '—'}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.roles.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1">
                      <Pastilla tono="activo">
                        {r.etiqueta}
                        {r.predioNombre ? ` · ${r.predioNombre}` : ''}
                      </Pastilla>
                      {r.puedeQuitarlo && p.roles.length > 1 && (
                        <BotonAccion
                          accion={quitarRol}
                          id={r.id}
                          className="h-6 px-1 text-xs"
                          confirmar={`¿Quitarle el rol ${r.etiqueta}?`}
                        >
                          <UserX className="size-3" />
                        </BotonAccion>
                      )}
                    </span>
                  ))}
                </div>
              </Td>
              <Td>
                <Pastilla tono={p.activo ? 'activo' : 'inactivo'}>
                  {p.activo ? 'Puede entrar' : 'Dada de baja'}
                </Pastilla>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  {p.administrable ? (
                    <>
                      <DialogoFormulario
                        titulo={`Editar a ${p.nombre}`}
                        accion={guardarPersona}
                        disparador={
                          <Button variant="ghost" size="sm" aria-label={`Editar a ${p.nombre}`}>
                            <Pencil />
                          </Button>
                        }
                      >
                        <CamposPersona persona={p} roles={roles} predios={predios} />
                      </DialogoFormulario>

                      <BotonAccion
                        accion={alternarPersona}
                        id={p.id}
                        confirmar={
                          p.activo
                            ? `¿Dar de baja a ${p.nombre}? No va a poder entrar más, pero se conserva todo lo que registró.`
                            : undefined
                        }
                      >
                        {p.activo ? 'Dar de baja' : 'Rehabilitar'}
                      </BotonAccion>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Fuera de tu alcance</span>
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
