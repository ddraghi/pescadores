import Link from 'next/link';
import { exigirCapacidad } from '@/lib/auth';
import { reservasDelSocio, socioDeSesion } from '@/lib/datos/socio';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Button } from '@/components/ui/button';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { BotonAccion } from '@/components/panel/dialogo-formulario';
import { cancelarReserva } from '@/lib/acciones/reservas';

const ESTADOS: Record<string, string> = {
  ACTIVA: 'Reservado',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  AUSENTE: 'No se presentó',
};

function cuando(desde: Date, hasta: Date, porNoche: boolean): string {
  const f = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const h = (d: Date) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return porNoche ? `${f(desde)} al ${f(hasta)}` : `${f(desde)} · ${h(desde)} a ${h(hasta)}`;
}

export default async function Pagina() {
  const sesion = await exigirCapacidad('panel_socio');
  const socio = await socioDeSesion(sesion);
  if (!socio) {
    return <p className="text-muted-foreground">Tu ficha de socio no está cargada.</p>;
  }

  const reservas = await reservasDelSocio(socio.id);
  const ahora = new Date();
  const proximas = reservas.filter((r) => r.hasta >= ahora && r.estado !== 'CANCELADA');
  const pasadas = reservas.filter((r) => r.hasta < ahora || r.estado === 'CANCELADA');

  function fila(r: (typeof reservas)[number]) {
    const porNoche = Boolean(r.alojamientoId);
    const que = r.alojamiento?.nombre ?? r.espacio?.nombre ?? 'Reserva';
    const predio = r.alojamiento?.predio.nombre ?? r.espacio?.predio.nombre ?? '';
    const cancelable = r.estado !== 'CANCELADA' && r.desde > ahora;

    return (
      <tr key={r.id}>
        <Td>
          <div className="font-medium">{que}</div>
          <div className="text-xs text-muted-foreground">{predio}</div>
        </Td>
        <Td className="text-sm">{cuando(r.desde, r.hasta, porNoche)}</Td>
        <Td className="text-right tabular-nums">{r.personas}</Td>
        <Td>
          <Pastilla tono={r.estado === 'CANCELADA' ? 'inactivo' : 'activo'}>
            {ESTADOS[r.estado] ?? r.estado}
          </Pastilla>
        </Td>
        <Td className="text-right">
          {cancelable && (
            <BotonAccion
              accion={cancelarReserva}
              id={r.id}
              confirmar={`¿Cancelar ${que} del ${r.desde.toLocaleDateString('es-AR')}?`}
            >
              Cancelar
            </BotonAccion>
          )}
        </Td>
      </tr>
    );
  }

  return (
    <>
      <EncabezadoPantalla
        titulo="Mis reservas"
        descripcion="Alojamiento, canchas y quinchos que tenés tomados."
        accion={
          <Button variant="outline" asChild>
            <Link href="/socio">Reservar algo</Link>
          </Button>
        }
      />

      <h2 className="mb-2 text-sm font-medium">Próximas</h2>
      <Tabla>
        <Encabezados>
          <Th>Qué</Th>
          <Th>Cuándo</Th>
          <Th className="text-right">Personas</Th>
          <Th>Estado</Th>
          <Th />
        </Encabezados>
        <Filas>
          {proximas.length === 0 && (
            <Vacio columnas={5}>
              No tenés nada reservado. Entrá a un predio desde tu panel para reservar.
            </Vacio>
          )}
          {proximas.map(fila)}
        </Filas>
      </Tabla>

      {pasadas.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-medium text-muted-foreground">Anteriores</h2>
          <Tabla>
            <Encabezados>
              <Th>Qué</Th>
              <Th>Cuándo</Th>
              <Th className="text-right">Personas</Th>
              <Th>Estado</Th>
              <Th />
            </Encabezados>
            <Filas>{pasadas.map(fila)}</Filas>
          </Tabla>
        </>
      )}
    </>
  );
}
