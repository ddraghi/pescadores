'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { CATEGORIAS, AYUDA_CATEGORIA, type NombreCategoria } from '@/lib/socios';
import type { SocioEnLista } from '@/lib/datos/socios';

export interface GrupoOpcion {
  id: string;
  nombre: string;
  integrantes: number;
}

/**
 * Alta y edición de un socio. Junta los datos de la persona y los de su ficha, que en
 * la base van separados —una persona puede ser socia y además tener un cargo—, pero
 * para quien carga el padrón es un solo formulario.
 */
export function CamposSocio({
  socio,
  grupos,
  proximoNumero,
}: {
  socio?: SocioEnLista;
  grupos: GrupoOpcion[];
  proximoNumero: number;
}) {
  const [categoria, setCategoria] = useState<NombreCategoria>(
    (socio?.categoria as NombreCategoria) ?? 'ACTIVO',
  );
  const [familia, setFamilia] = useState<'ninguno' | 'existente' | 'nuevo'>(
    socio?.grupoFamiliarId ? 'existente' : 'ninguno',
  );
  const editando = Boolean(socio);

  return (
    <>
      {socio && <input type="hidden" name="socioId" value={socio.id} />}

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Datos personales
      </p>

      <Campo etiqueta="Nombre y apellido" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={socio?.nombre} required autoFocus />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="DNI" htmlFor="dni" ayuda="Sin puntos.">
          <Input id="dni" name="dni" inputMode="numeric" defaultValue={socio?.dni} required />
        </Campo>
        <Campo etiqueta="Fecha de nacimiento" htmlFor="fechaNacimiento">
          <Input
            id="fechaNacimiento"
            name="fechaNacimiento"
            type="date"
            defaultValue={socio?.fechaNacimiento ?? ''}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Correo" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={socio?.email ?? ''} />
        </Campo>
        <Campo etiqueta="Teléfono" htmlFor="telefono">
          <Input id="telefono" name="telefono" defaultValue={socio?.telefono ?? ''} />
        </Campo>
      </div>

      <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Ficha de socio
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Número de socio" htmlFor="numeroSocio">
          <Input
            id="numeroSocio"
            name="numeroSocio"
            type="number"
            min={1}
            defaultValue={socio?.numeroSocio ?? proximoNumero}
            required
          />
        </Campo>
        <Campo etiqueta="Fecha de ingreso" htmlFor="fechaIngreso">
          <Input
            id="fechaIngreso"
            name="fechaIngreso"
            type="date"
            defaultValue={socio?.fechaIngreso ?? new Date().toISOString().slice(0, 10)}
            required
          />
        </Campo>
      </div>

      <Campo etiqueta="Categoría" htmlFor="categoria" ayuda={AYUDA_CATEGORIA[categoria]}>
        <Selector
          id="categoria"
          name="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as NombreCategoria)}
        >
          {Object.entries(CATEGORIAS).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Selector>
      </Campo>

      {categoria === 'TRANSEUNTE' && (
        <Campo
          etiqueta="El permiso vence el"
          htmlFor="permisoHasta"
          ayuda="Al vencer, los beneficios caducan solos (art. 14 inc. e)."
        >
          <Input
            id="permisoHasta"
            name="permisoHasta"
            type="date"
            defaultValue={socio?.permisoHasta ?? ''}
            required
          />
        </Campo>
      )}

      <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Grupo familiar
      </p>

      <Campo etiqueta="Pertenece a" htmlFor="familia">
        <Selector
          id="familia"
          value={familia}
          onChange={(e) => setFamilia(e.target.value as typeof familia)}
        >
          <option value="ninguno">Sin grupo familiar</option>
          <option value="existente">Sumarlo a un grupo que ya existe</option>
          <option value="nuevo">Crear un grupo nuevo</option>
        </Selector>
      </Campo>

      {familia === 'existente' && (
        <Campo etiqueta="Grupo" htmlFor="grupoFamiliarId">
          <Selector id="grupoFamiliarId" name="grupoFamiliarId" defaultValue={socio?.grupoFamiliarId ?? ''} required>
            <option value="">Elegí un grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} ({g.integrantes})
              </option>
            ))}
          </Selector>
        </Campo>
      )}

      {familia === 'nuevo' && (
        <Campo etiqueta="Nombre del grupo" htmlFor="grupoFamiliarNuevo" ayuda="Por ejemplo, el apellido de la familia.">
          <Input id="grupoFamiliarNuevo" name="grupoFamiliarNuevo" required />
        </Campo>
      )}

      {familia !== 'ninguno' && (
        <Casilla
          name="esTitular"
          etiqueta="Es el titular del grupo"
          ayuda="El titular es quien responde por la cuota del grupo."
          defaultChecked={socio?.esTitular}
        />
      )}

      <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Acceso a la plataforma
      </p>
      <p className="text-xs text-muted-foreground">
        Opcional. Un cadete chico figura en el padrón pero no necesita entrar.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Usuario" htmlFor="usuario">
          <Input id="usuario" name="usuario" defaultValue={socio?.usuario ?? ''} />
        </Campo>
        <Campo
          etiqueta={editando ? 'Contraseña nueva' : 'Contraseña'}
          htmlFor="clave"
          ayuda={editando ? 'En blanco, no se cambia.' : 'Al menos 8 caracteres.'}
        >
          <Input id="clave" name="clave" type="password" minLength={8} />
        </Campo>
      </div>

      <Campo etiqueta="Observaciones" htmlFor="observaciones">
        <Input id="observaciones" name="observaciones" defaultValue={socio?.observaciones ?? ''} />
      </Campo>
    </>
  );
}
