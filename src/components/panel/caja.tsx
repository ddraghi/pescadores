'use client';

import { Landmark, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, Selector } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from '@/components/panel/tabla';
import { abrirCaja, cerrarCaja } from '@/lib/acciones/tesoreria';
import { MEDIOS_PAGO, type NombreMedioPago } from '@/lib/tarifario';
import { pesos } from '@/lib/utils';

export interface MovimientoCaja {
  id: string;
  pagador: string;
  medioPago: string;
  total: number;
  ocurridoEn: string;
}

export interface CajaAbierta {
  id: string;
  predioNombre: string;
  accesoNombre: string | null;
  abiertaEn: string;
  movimientos: MovimientoCaja[];
}

/**
 * Caja de un turno. Es la misma para el portero, el cobrador y Tesorería: lo único que
 * cambia es dónde se abre.
 *
 * El arqueo guarda lo declarado JUNTO a lo registrado, sin corregir ninguno de los dos.
 * La diferencia entre ambos es exactamente el dato que Tesorería necesita ver.
 */
export function PanelCaja({
  caja,
  predios,
  titulo = 'Mi caja',
}: {
  caja: CajaAbierta | null;
  predios: { id: string; nombre: string }[];
  titulo?: string;
}) {
  if (!caja) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="size-5" />
            {titulo}
          </CardTitle>
          <CardDescription>
            No tenés ninguna caja abierta. Abrí una para empezar a cobrar: todo lo que cobres
            durante el turno queda adentro, y al cerrarla hacés el arqueo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DialogoFormulario
            titulo="Abrir caja"
            accion={abrirCaja}
            textoGuardar="Abrir"
            disparador={
              <Button disabled={predios.length === 0}>
                <Landmark />
                Abrir caja
              </Button>
            }
          >
            <Campo etiqueta="Predio" htmlFor="predioId">
              <Selector id="predioId" name="predioId" required>
                <option value="">Elegí el predio</option>
                {predios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>
          </DialogoFormulario>
        </CardContent>
      </Card>
    );
  }

  const porMedio = new Map<string, number>();
  for (const m of caja.movimientos) {
    porMedio.set(m.medioPago, (porMedio.get(m.medioPago) ?? 0) + m.total);
  }
  const total = caja.movimientos.reduce((s, m) => s + m.total, 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="size-5" />
            {titulo} · {caja.predioNombre}
            {caja.accesoNombre && <span className="text-muted-foreground">· {caja.accesoNombre}</span>}
          </CardTitle>
          <CardDescription>Abierta el {caja.abiertaEn}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2">
              <div className="text-xl font-bold tabular-nums">{pesos(total)}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Total del turno
              </div>
            </div>
            {[...porMedio.entries()].map(([medio, monto]) => (
              <div key={medio} className="rounded-md border border-border px-3 py-2">
                <div className="text-lg font-bold tabular-nums">{pesos(monto)}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {MEDIOS_PAGO[medio as NombreMedioPago] ?? medio}
                </div>
              </div>
            ))}
          </div>

          <div>
            <DialogoFormulario
              titulo="Cerrar la caja"
              descripcion="Declará cuánto tenés de cada medio de pago. Si no coincide con lo registrado, la diferencia queda asentada: no se corrige ninguno de los dos números."
              accion={cerrarCaja}
              textoGuardar="Cerrar caja"
              disparador={
                <Button variant="outline">
                  <LockKeyhole />
                  Cerrar caja y arquear
                </Button>
              }
            >
              <input type="hidden" name="cajaId" value={caja.id} />
              {Object.entries(MEDIOS_PAGO).map(([valor, etiqueta]) => {
                const registrado = porMedio.get(valor) ?? 0;
                return (
                  <Campo
                    key={valor}
                    etiqueta={etiqueta}
                    htmlFor={`dec-${valor}`}
                    ayuda={`Registrado: ${pesos(registrado)}`}
                  >
                    <Input
                      id={`dec-${valor}`}
                      name={`declarado_${valor}`}
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={registrado}
                    />
                  </Campo>
                );
              })}
              <Campo etiqueta="Observaciones" htmlFor="obs-caja">
                <Input id="obs-caja" name="observaciones" placeholder="Si hay diferencia, explicá por qué" />
              </Campo>
            </DialogoFormulario>
          </div>
        </CardContent>
      </Card>

      <Tabla>
        <Encabezados>
          <Th>Hora</Th>
          <Th>Cobrado a</Th>
          <Th>Medio</Th>
          <Th className="text-right">Importe</Th>
        </Encabezados>
        <Filas>
          {caja.movimientos.length === 0 && (
            <Vacio columnas={4}>Todavía no cobraste nada en este turno.</Vacio>
          )}
          {caja.movimientos.map((m) => (
            <tr key={m.id}>
              <Td className="font-mono text-xs text-muted-foreground">{m.ocurridoEn}</Td>
              <Td className="font-medium">{m.pagador}</Td>
              <Td className="text-sm text-muted-foreground">
                {MEDIOS_PAGO[m.medioPago as NombreMedioPago] ?? m.medioPago}
              </Td>
              <Td className="text-right tabular-nums">{pesos(m.total)}</Td>
            </tr>
          ))}
        </Filas>
      </Tabla>
    </div>
  );
}
