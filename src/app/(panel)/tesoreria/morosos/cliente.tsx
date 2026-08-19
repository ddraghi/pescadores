'use client';

import { UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { CobrarCuotas, type CuotaCobrable } from '@/components/panel/cobrar-cuotas';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { asignarCobrador } from '@/lib/acciones/tesoreria';
import { ESTADOS, type NombreEstado } from '@/lib/socios';
import { pesos } from '@/lib/utils';

export interface DeudorEnLista {
  socioId: string;
  numeroSocio: number;
  nombre: string;
  estado: string;
  deuda: number;
  cuotas: CuotaCobrable[];
  vencidas: number;
  cobradorId: string | null;
  cobradorNombre: string | null;
}

export function MorososCliente({
  deudores,
  cobradores,
  predios,
  tieneCajaAbierta,
}: {
  deudores: DeudorEnLista[];
  cobradores: { id: string; nombre: string }[];
  predios: { id: string; nombre: string }[];
  tieneCajaAbierta: boolean;
}) {
  return (
    <Tabla>
      <Encabezados>
        <Th className="text-right">N°</Th>
        <Th>Socio</Th>
        <Th>Estado</Th>
        <Th className="text-right">Cuotas</Th>
        <Th className="text-right">Deuda</Th>
        <Th>Cobrador</Th>
        <Th />
      </Encabezados>
      <Filas>
        {deudores.length === 0 && (
          <Vacio columnas={7}>
            Ningún socio adeuda cuotas. Si acabás de generar un período, recordá recalcular la
            morosidad para que los estados se pongan al día.
          </Vacio>
        )}

        {deudores.map((d) => (
          <tr key={d.socioId}>
            <Td className="text-right font-mono tabular-nums text-muted-foreground">
              {d.numeroSocio}
            </Td>
            <Td className="font-medium">{d.nombre}</Td>
            <Td>
              <Pastilla tono={d.estado === 'EMPLAZADO' ? 'inactivo' : 'neutro'}>
                {ESTADOS[d.estado as NombreEstado] ?? d.estado}
              </Pastilla>
            </Td>
            <Td className="text-right tabular-nums">
              {d.cuotas.length}
              {d.vencidas > 0 && (
                <span className="ml-1 text-xs text-marca">({d.vencidas} vencidas)</span>
              )}
            </Td>
            <Td className="text-right font-medium tabular-nums">{pesos(d.deuda)}</Td>
            <Td className="text-sm text-muted-foreground">{d.cobradorNombre ?? '—'}</Td>
            <Td>
              <div className="flex items-center justify-end gap-1">
                <CobrarCuotas
                  socioId={d.socioId}
                  socioNombre={d.nombre}
                  cuotas={d.cuotas}
                  predios={predios}
                  tieneCajaAbierta={tieneCajaAbierta}
                />

                {cobradores.length > 0 && (
                  <DialogoFormulario
                    titulo={`Cartera de cobranza de ${d.nombre}`}
                    descripcion="Asignar un cobrador hace que este socio le aparezca en su cartera para cobrarle a domicilio."
                    accion={asignarCobrador}
                    textoGuardar="Asignar"
                    disparador={
                      <Button variant="ghost" size="sm" aria-label={`Asignar cobrador a ${d.nombre}`}>
                        <UserCog />
                      </Button>
                    }
                  >
                    <input type="hidden" name="socioId" value={d.socioId} />
                    <Campo etiqueta="Cobrador" htmlFor={`cob-${d.socioId}`}>
                      <Selector
                        id={`cob-${d.socioId}`}
                        name="cobradorId"
                        defaultValue={d.cobradorId ?? ''}
                      >
                        <option value="">Sin cobrador asignado</option>
                        {cobradores.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </Selector>
                    </Campo>
                  </DialogoFormulario>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </Filas>
    </Tabla>
  );
}
