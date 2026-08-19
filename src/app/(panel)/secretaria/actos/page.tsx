import Link from 'next/link';
import { CategoriaSocio } from '@prisma/client';
import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';
import { CATEGORIAS, ESTADOS, ANIOS_PARA_VITALICIO, EDAD_FIN_CADETE } from '@/lib/socios';
import type { NombreCategoria, NombreEstado } from '@/lib/socios';
import { PasarACategoria } from './cliente';

function haceAnios(n: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

/**
 * Situaciones que el estatuto obliga a resolver, detectadas solas.
 *
 * No cambia nada por su cuenta: cada pase lo confirma la Secretaría, porque el estatuto
 * pone esas decisiones en manos de la comisión, no de un proceso automático.
 */
export default async function Pagina() {
  await exigirCapacidad('actos_estatutarios');

  const hoy = new Date();

  const [permisosVencidos, cadetesGrandes, candidatosVitalicios, historial] = await Promise.all([
    prisma.socio.findMany({
      where: { categoria: CategoriaSocio.TRANSEUNTE, permisoHasta: { lt: hoy } },
      orderBy: { permisoHasta: 'asc' },
      take: 50,
      include: { persona: { select: { nombre: true } } },
    }),
    prisma.socio.findMany({
      where: {
        categoria: CategoriaSocio.CADETE,
        persona: { fechaNacimiento: { lte: haceAnios(EDAD_FIN_CADETE) } },
      },
      orderBy: { numeroSocio: 'asc' },
      take: 50,
      include: { persona: { select: { nombre: true, fechaNacimiento: true } } },
    }),
    prisma.socio.findMany({
      where: {
        categoria: CategoriaSocio.ACTIVO,
        fechaIngreso: { lte: haceAnios(ANIOS_PARA_VITALICIO) },
      },
      orderBy: { fechaIngreso: 'asc' },
      take: 50,
      include: { persona: { select: { nombre: true } } },
    }),
    prisma.actoEstatutario.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 30,
      include: { socio: { include: { persona: { select: { nombre: true } } } } },
    }),
  ]);

  const etiqueta = (tipo: string, valor: string) =>
    tipo === 'ESTADO'
      ? (ESTADOS[valor as NombreEstado] ?? valor)
      : (CATEGORIAS[valor as NombreCategoria] ?? valor);

  return (
    <>
      <EncabezadoPantalla
        titulo="Actos estatutarios"
        descripcion="Situaciones que el estatuto obliga a resolver. El sistema las detecta, pero no cambia nada solo: cada pase lo confirma la Secretaría."
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cadetes que cumplieron {EDAD_FIN_CADETE}</CardTitle>
            <CardDescription>
              El cadete es el menor de {EDAD_FIN_CADETE} años (art. 14 inc. d). Al cumplirlos
              corresponde pasarlo a activo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th className="text-right">N°</Th>
                <Th>Socio</Th>
                <Th>Nacimiento</Th>
                <Th />
              </Encabezados>
              <Filas>
                {cadetesGrandes.length === 0 && (
                  <Vacio columnas={4}>Ningún cadete pasó la edad.</Vacio>
                )}
                {cadetesGrandes.map((s) => (
                  <tr key={s.id}>
                    <Td className="text-right font-mono text-muted-foreground">{s.numeroSocio}</Td>
                    <Td className="font-medium">{s.persona.nombre}</Td>
                    <Td className="text-muted-foreground">
                      {s.persona.fechaNacimiento?.toISOString().slice(0, 10)}
                    </Td>
                    <Td className="text-right">
                      <PasarACategoria
                        socioId={s.id}
                        nombre={s.persona.nombre}
                        categoria="ACTIVO"
                        motivoSugerido={`Cumplió ${EDAD_FIN_CADETE} años (art. 14 inc. d)`}
                      />
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activos con {ANIOS_PARA_VITALICIO} años de antigüedad</CardTitle>
            <CardDescription>
              El socio activo pasa a vitalicio después de {ANIOS_PARA_VITALICIO} años ininterrumpidos
              en esa categoría (art. 17 inc. b).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th className="text-right">N°</Th>
                <Th>Socio</Th>
                <Th>Ingresó</Th>
                <Th />
              </Encabezados>
              <Filas>
                {candidatosVitalicios.length === 0 && (
                  <Vacio columnas={4}>Ningún activo llegó a la antigüedad.</Vacio>
                )}
                {candidatosVitalicios.map((s) => (
                  <tr key={s.id}>
                    <Td className="text-right font-mono text-muted-foreground">{s.numeroSocio}</Td>
                    <Td className="font-medium">{s.persona.nombre}</Td>
                    <Td className="text-muted-foreground">
                      {s.fechaIngreso.toISOString().slice(0, 10)}
                    </Td>
                    <Td className="text-right">
                      <PasarACategoria
                        socioId={s.id}
                        nombre={s.persona.nombre}
                        categoria="VITALICIO"
                        motivoSugerido={`${ANIOS_PARA_VITALICIO} años ininterrumpidos como activo (art. 17 inc. b)`}
                      />
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transeúntes con el permiso vencido</CardTitle>
            <CardDescription>
              Los beneficios del transeúnte caducan solos al vencer el permiso (art. 14 inc. e).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th className="text-right">N°</Th>
                <Th>Socio</Th>
                <Th>Venció</Th>
                <Th>Estado</Th>
              </Encabezados>
              <Filas>
                {permisosVencidos.length === 0 && (
                  <Vacio columnas={4}>Ningún permiso vencido.</Vacio>
                )}
                {permisosVencidos.map((s) => (
                  <tr key={s.id}>
                    <Td className="text-right font-mono text-muted-foreground">{s.numeroSocio}</Td>
                    <Td className="font-medium">{s.persona.nombre}</Td>
                    <Td className="text-marca">{s.permisoHasta?.toISOString().slice(0, 10)}</Td>
                    <Td>
                      <Pastilla>{ESTADOS[s.estado as NombreEstado]}</Pastilla>
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos actos registrados</CardTitle>
            <CardDescription>
              Cada cambio de estado o de categoría queda asentado con su fecha y su motivo.{' '}
              <Link href="/secretaria/socios" className="text-marca underline underline-offset-2">
                Ir al padrón
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Fecha</Th>
                <Th>Socio</Th>
                <Th>Cambio</Th>
                <Th>Motivo</Th>
              </Encabezados>
              <Filas>
                {historial.length === 0 && (
                  <Vacio columnas={4}>Todavía no se registró ningún acto.</Vacio>
                )}
                {historial.map((a) => (
                  <tr key={a.id}>
                    <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {a.creadoEn.toISOString().slice(0, 10)}
                    </Td>
                    <Td className="font-medium">{a.socio.persona.nombre}</Td>
                    <Td className="text-sm">
                      {etiqueta(a.tipo, a.desde)} → <strong>{etiqueta(a.tipo, a.hasta)}</strong>
                    </Td>
                    <Td className="text-sm text-muted-foreground">{a.motivo ?? '—'}</Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
