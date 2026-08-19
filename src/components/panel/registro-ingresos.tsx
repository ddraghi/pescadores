import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';

export interface IngresoEnLista {
  id: string;
  nombre: string;
  resultado: string;
  motivo: string | null;
  acceso: string;
  predio: string;
  cuando: string;
  importe?: number | null;
}

/**
 * Traducción de los códigos que deja la decisión de acceso.
 *
 * Los rechazos se registran igual que los pases: saber quién llegó sin apto, con el
 * permiso vencido o con la cuota impaga es justamente el dato que el club necesita.
 */
const MOTIVOS: Record<string, string> = {
  al_dia: 'Socio al día',
  moroso: 'Con cuotas impagas',
  emplazado: 'Emplazado (art. 28)',
  licencia: 'En licencia, pagó como no socio',
  no_socio: 'No socio, pagó la entrada',
  menor_5: 'Menor de 5 años',
  autorizacion_estadia: 'Con permiso de estadía',
  permiso_vencido: 'Permiso de transeúnte vencido',
  sin_derecho: 'Sin derecho de temporada',
  apto_vencido: 'Apto médico vencido',
  apto_rechazado: 'No autorizado por el médico',
  no_socio_en_control: 'No socio en un puesto interno',
  licencia_en_control: 'En licencia, en un puesto interno',
  estado_cesante: 'Cesante',
  estado_expulsado: 'Expulsado',
  estado_suspendido: 'Suspendido',
};

export function RegistroDeIngresos({ ingresos }: { ingresos: IngresoEnLista[] }) {
  return (
    <Tabla>
      <Encabezados>
        <Th>Cuándo</Th>
        <Th>Quién</Th>
        <Th>Puesto</Th>
        <Th>Resultado</Th>
        <Th>Motivo</Th>
      </Encabezados>
      <Filas>
        {ingresos.length === 0 && <Vacio columnas={5}>Todavía no pasó nadie.</Vacio>}
        {ingresos.map((i) => (
          <tr key={i.id}>
            <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">{i.cuando}</Td>
            <Td className="font-medium">{i.nombre}</Td>
            <Td className="text-sm text-muted-foreground">
              {i.acceso}
              <div className="text-xs">{i.predio}</div>
            </Td>
            <Td>
              <Pastilla tono={i.resultado === 'PERMITIDO' ? 'activo' : 'inactivo'}>
                {i.resultado === 'PERMITIDO' ? 'Pasó' : 'No pasó'}
              </Pastilla>
            </Td>
            <Td className="text-sm text-muted-foreground">
              {i.motivo ? (MOTIVOS[i.motivo] ?? i.motivo) : '—'}
            </Td>
          </tr>
        ))}
      </Filas>
    </Tabla>
  );
}
