'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Campo, Casilla, Selector } from '@/components/ui/campos';
import { CATEGORIAS, AYUDA_CATEGORIA, type NombreCategoria } from '@/lib/socios';
import type { SocioEnLista } from '@/lib/datos/socios';
import { GrupoFamiliar } from './grupo-familiar';

/**
 * Alta y edición de un socio. Junta los datos de la persona y los de su ficha, que en
 * la base van separados —una persona puede ser socia y además tener un cargo—, pero
 * para quien carga el padrón es un solo formulario.
 */
export function CamposSocio({
  socio,
  proximoNumero,
}: {
  socio?: SocioEnLista;
  proximoNumero: number;
}) {
  const [categoria, setCategoria] = useState<NombreCategoria>(
    (socio?.categoria as NombreCategoria) ?? 'ACTIVO',
  );
  // El nombre se sigue con estado porque el grupo familiar se llama como el titular:
  // conviene que se vea cambiar mientras se escribe.
  const [nombre, setNombre] = useState(socio?.nombre ?? '');
  const editando = Boolean(socio);

  return (
    <>
      {socio && <input type="hidden" name="socioId" value={socio.id} />}

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Datos personales
      </p>

      <Campo etiqueta="Nombre y apellido" htmlFor="nombre">
        <Input
          id="nombre"
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          autoFocus
        />
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

      <GrupoFamiliar
        nombreTitular={nombre}
        familiares={socio?.familiares ?? []}
        perteneceA={socio?.titularId ? socio.grupoFamiliar : null}
        proximoNumero={proximoNumero + 1}
      />

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
