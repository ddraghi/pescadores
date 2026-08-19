import { exigirCapacidad } from '@/lib/auth';
import { socioDeSesion } from '@/lib/datos/socio';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Tabla, Encabezados, Th, Td, Filas, Pastilla } from '@/components/panel/tabla';
import { CATEGORIAS, ESTADOS, type NombreCategoria, type NombreEstado } from '@/lib/socios';

export default async function Pagina() {
  const sesion = await exigirCapacidad('panel_socio');
  const socio = await socioDeSesion(sesion);
  if (!socio) return <p className="text-muted-foreground">Tu ficha de socio no está cargada.</p>;

  // El grupo es el titular y los que cuelgan de él. Quien mira puede ser cualquiera de
  // los dos, así que primero hay que ubicarse.
  const titular = socio.titular ?? (socio.familiares.length > 0 ? socio : null);
  const familiares = socio.titular ? socio.titular.familiares : socio.familiares;

  return (
    <>
      <EncabezadoPantalla
        titulo="Mi grupo familiar"
        descripcion="Quiénes están incluidos. Los cambios los hace Secretaría."
      />

      {!titular ? (
        <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
          No pertenecés a ningún grupo familiar: tu cuota es individual. Si querés armar uno,
          comunicate con Secretaría.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Grupo de <strong className="text-foreground">{titular.persona.nombre}</strong>, que
            paga la cuota por todo el grupo.
          </p>
          <Tabla>
            <Encabezados>
              <Th className="text-right">N°</Th>
              <Th>Integrante</Th>
              <Th>Parentesco</Th>
              <Th>Categoría</Th>
              <Th>Estado</Th>
            </Encabezados>
            <Filas>
              {[titular, ...familiares].map((i) => (
                <tr key={i.id}>
                  <Td className="text-right font-mono tabular-nums text-muted-foreground">
                    {i.numeroSocio}
                  </Td>
                  <Td>
                    <span className="font-medium">{i.persona.nombre}</span>
                    {i.id === socio.id && (
                      <span className="ml-2 text-[11px] text-muted-foreground">sos vos</span>
                    )}
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {i.id === titular.id ? (
                      <span className="text-[11px] uppercase tracking-wider text-marca">Titular</span>
                    ) : (
                      (i.parentesco ?? '—')
                    )}
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {CATEGORIAS[i.categoria as NombreCategoria]}
                  </Td>
                  <Td>
                    <Pastilla tono={i.estado === 'AL_DIA' ? 'activo' : 'neutro'}>
                      {ESTADOS[i.estado as NombreEstado]}
                    </Pastilla>
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
