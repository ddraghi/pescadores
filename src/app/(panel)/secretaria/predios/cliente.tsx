'use client';

import { Pencil, Plus, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Casilla } from '@/components/ui/campos';
import { DialogoFormulario, BotonAccion } from '@/components/panel/dialogo-formulario';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { guardarPredio, alternarPredio } from '@/lib/acciones/estructura';

export interface PredioEnLista {
  id: string;
  nombre: string;
  slug: string;
  direccion: string | null;
  conexionSatelital: boolean;
  activo: boolean;
  orden: number;
  accesos: number;
  alojamientos: number;
  espacios: number;
}

function CamposPredio({ predio }: { predio?: PredioEnLista }) {
  return (
    <>
      {predio && <input type="hidden" name="id" value={predio.id} />}

      <Campo etiqueta="Nombre" htmlFor="nombre">
        <Input id="nombre" name="nombre" defaultValue={predio?.nombre} required autoFocus />
      </Campo>

      <Campo etiqueta="Dirección" htmlFor="direccion">
        <Input id="direccion" name="direccion" defaultValue={predio?.direccion ?? ''} />
      </Campo>

      <Campo
        etiqueta="Orden en el listado"
        htmlFor="orden"
        ayuda="Define en qué posición aparece en los menús y selectores."
      >
        <Input id="orden" name="orden" type="number" min={0} defaultValue={predio?.orden ?? 0} />
      </Campo>

      <Casilla
        name="conexionSatelital"
        etiqueta="Se conecta por satélite (Starlink)"
        ayuda="Marcalo en los predios remotos. El sistema va a exigir que los interruptores de sus accesos salgan por la red local, porque una orden por la nube tarda segundos en abrir."
        defaultChecked={predio?.conexionSatelital}
      />
    </>
  );
}

export function PrediosCliente({ predios }: { predios: PredioEnLista[] }) {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DialogoFormulario
          titulo="Nuevo predio"
          descripcion="Los predios son la base de todo: los accesos, las instalaciones y las actividades cuelgan de ellos."
          accion={guardarPredio}
          textoGuardar="Crear predio"
          disparador={
            <Button>
              <Plus />
              Nuevo predio
            </Button>
          }
        >
          <CamposPredio />
        </DialogoFormulario>
      </div>

      <Tabla>
        <Encabezados>
          <Th>Predio</Th>
          <Th>Enlace</Th>
          <Th className="text-right">Accesos</Th>
          <Th className="text-right">Alojamientos</Th>
          <Th className="text-right">Espacios</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {predios.length === 0 && (
            <Vacio columnas={7}>Todavía no hay predios cargados.</Vacio>
          )}

          {predios.map((p) => (
            <tr key={p.id} className={p.activo ? undefined : 'opacity-60'}>
              <Td>
                <div className="font-medium">{p.nombre}</div>
                {p.direccion && (
                  <div className="text-xs text-muted-foreground">{p.direccion}</div>
                )}
              </Td>
              <Td>
                {p.conexionSatelital ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-marca">
                    <Satellite className="size-3.5" />
                    Satelital
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Terrestre</span>
                )}
              </Td>
              <Td className="text-right tabular-nums">{p.accesos}</Td>
              <Td className="text-right tabular-nums">{p.alojamientos}</Td>
              <Td className="text-right tabular-nums">{p.espacios}</Td>
              <Td>
                <Pastilla tono={p.activo ? 'activo' : 'inactivo'}>
                  {p.activo ? 'Activo' : 'Dado de baja'}
                </Pastilla>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <DialogoFormulario
                    titulo={`Editar ${p.nombre}`}
                    accion={guardarPredio}
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Editar ${p.nombre}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    <CamposPredio predio={p} />
                  </DialogoFormulario>

                  <BotonAccion
                    accion={alternarPredio}
                    id={p.id}
                    confirmar={
                      p.activo
                        ? `¿Dar de baja ${p.nombre}? Deja de aparecer para cargar cosas nuevas, pero se conserva todo su historial.`
                        : undefined
                    }
                  >
                    {p.activo ? 'Dar de baja' : 'Reactivar'}
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
