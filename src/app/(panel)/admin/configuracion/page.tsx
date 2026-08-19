import { Check, TriangleAlert } from 'lucide-react';
import { exigirCapacidad } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabla, Encabezados, Th, Td, Filas, Vacio, Pastilla } from '@/components/panel/tabla';

interface Integracion {
  nombre: string;
  variable: string;
  listo: boolean;
  para: string;
}

/**
 * Estado de las integraciones del club.
 *
 * Las credenciales NO se cargan ni se muestran desde acá: viven en variables de entorno
 * del servidor. Es a propósito — un secreto que se puede leer desde una pantalla es un
 * secreto que se filtra el día que alguien deja la sesión abierta. Esta pantalla dice
 * qué está configurado y qué falta; el valor se pone en el servidor.
 */
export default async function Pagina() {
  await exigirCapacidad('configurar_plataforma');

  const hay = (v?: string) => Boolean(v && v.trim());

  const integraciones: Integracion[] = [
    {
      nombre: 'eWeLink (Sonoff)',
      variable: 'EWELINK_APP_ID / EWELINK_APP_SECRET',
      listo: hay(process.env.EWELINK_APP_ID) && hay(process.env.EWELINK_APP_SECRET),
      para: 'Vincular la cuenta del club para los interruptores que no se puedan operar por red local.',
    },
    {
      nombre: 'Mercado Pago',
      variable: 'MERCADOPAGO_ACCESS_TOKEN',
      listo: hay(process.env.MERCADOPAGO_ACCESS_TOKEN),
      para: 'Cobro con QR en las porterías y pago de cuotas por el socio.',
    },
    {
      nombre: 'Correo saliente',
      variable: 'SMTP_HOST / SMTP_USER / SMTP_PASSWORD',
      listo: hay(process.env.SMTP_HOST) && hay(process.env.SMTP_USER),
      para: 'Avisos de vencimiento de cuota y de apto médico.',
    },
  ];

  const simulando = process.env.SIMULAR_DISPOSITIVOS === 'true';

  const [porPredio, sinVincular] = await Promise.all([
    prisma.dispositivo.groupBy({ by: ['predioId'], _count: true }),
    prisma.dispositivo.findMany({
      where: { deviceId: { startsWith: 'por-vincular-' } },
      include: { predio: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
    }),
  ]);

  const predios = await prisma.predio.findMany({
    where: { id: { in: porPredio.map((p) => p.predioId) } },
    select: { id: true, nombre: true, conexionSatelital: true },
  });

  return (
    <>
      <EncabezadoPantalla
        titulo="Configuración"
        descripcion="Estado de las cuentas y las claves que usa la plataforma. Los valores se cargan en el servidor, no desde acá."
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Integraciones</CardTitle>
            <CardDescription>
              Cada una se activa poniendo su variable de entorno en el servidor y reiniciando.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Servicio</Th>
                <Th>Para qué</Th>
                <Th>Variable</Th>
                <Th>Estado</Th>
              </Encabezados>
              <Filas>
                {integraciones.map((i) => (
                  <tr key={i.nombre}>
                    <Td className="font-medium">{i.nombre}</Td>
                    <Td className="text-sm text-muted-foreground">{i.para}</Td>
                    <Td className="font-mono text-xs text-muted-foreground">{i.variable}</Td>
                    <Td>
                      {i.listo ? (
                        <Pastilla tono="activo">
                          <Check className="mr-1 size-3" />
                          Configurada
                        </Pastilla>
                      ) : (
                        <Pastilla tono="inactivo">Sin configurar</Pastilla>
                      )}
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispositivos por predio</CardTitle>
            <CardDescription>
              Los interruptores los carga cada jefe de predio en su panel. Acá se ve el total.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {simulando && (
              <p className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-marca" />
                <span>
                  <strong className="text-marca">Modo simulado encendido.</strong> Las órdenes se dan
                  por aplicadas sin que haya aparatos. Antes de poner esto en producción hay que
                  apagar <code className="font-mono text-xs">SIMULAR_DISPOSITIVOS</code>.
                </span>
              </p>
            )}

            <Tabla>
              <Encabezados>
                <Th>Predio</Th>
                <Th>Enlace</Th>
                <Th className="text-right">Dispositivos</Th>
              </Encabezados>
              <Filas>
                {predios.length === 0 && <Vacio columnas={3}>Todavía no hay dispositivos cargados.</Vacio>}
                {predios.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-medium">{p.nombre}</Td>
                    <Td className="text-sm text-muted-foreground">
                      {p.conexionSatelital ? 'Satelital' : 'Terrestre'}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {porPredio.find((x) => x.predioId === p.id)?._count ?? 0}
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>

        {sinVincular.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pendientes de vincular</CardTitle>
              <CardDescription>
                Estos dispositivos se crearon con un identificador provisorio. Hay que darlos de
                alta en la aplicación de eWeLink y cargar acá el identificador real, o no van a
                poder accionarse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabla>
                <Encabezados>
                  <Th>Dispositivo</Th>
                  <Th>Predio</Th>
                  <Th>Identificador provisorio</Th>
                </Encabezados>
                <Filas>
                  {sinVincular.map((d) => (
                    <tr key={d.id}>
                      <Td className="font-medium">{d.nombre}</Td>
                      <Td className="text-sm text-muted-foreground">{d.predio.nombre}</Td>
                      <Td className="font-mono text-xs text-marca">{d.deviceId}</Td>
                    </tr>
                  ))}
                </Filas>
              </Tabla>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
