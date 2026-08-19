import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, CalendarDays, MapPin, Stethoscope, Waves } from 'lucide-react';
import { exigirCapacidad } from '@/lib/auth';
import { prediosParaSocio, resumenDelSocio, socioDeSesion } from '@/lib/datos/socio';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pesos } from '@/lib/utils';
import { CATEGORIAS, ESTADOS, type NombreCategoria, type NombreEstado } from '@/lib/socios';

/** Cada predio tiene su foto en public/predios. La Sede todavía espera la suya. */
function fotoDe(slug: string): string {
  return slug === 'sede-yrigoyen' ? '/predios/sede-yrigoyen.svg' : `/predios/${slug}.jpg`;
}

/**
 * La pantalla principal del socio: los predios.
 *
 * El socio no piensa en funciones, piensa en lugares — no dice «quiero reservar un
 * alojamiento», dice «me voy al Nihuil el finde». Por eso se entra por el predio y
 * adentro está lo que se puede hacer ahí. Lo del club, que no es de ningún predio en
 * particular, vive en el menú lateral.
 */
export default async function Pagina() {
  const sesion = await exigirCapacidad('panel_socio');
  const socio = await socioDeSesion(sesion);

  if (!socio) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
        Tu ficha de socio todavía no está cargada. Comunicate con Secretaría.
      </p>
    );
  }

  const [resumen, predios] = await Promise.all([
    resumenDelSocio(socio.id),
    prediosParaSocio(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Hola, {socio.persona.nombre.split(',')[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Socio {socio.numeroSocio} · {CATEGORIAS[socio.categoria as NombreCategoria]} ·{' '}
          {ESTADOS[socio.estado as NombreEstado]}
        </p>
      </div>

      {/* Lo que conviene que vea antes de salir de casa */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resumen.deuda > 0 && (
          <Link href="/socio/cuota">
            <Card className="border-accent/40 bg-accent/10 transition-colors hover:bg-accent/15">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="size-5 shrink-0 text-marca" />
                <div>
                  <div className="font-semibold">{pesos(resumen.deuda)}</div>
                  <div className="text-xs text-muted-foreground">
                    {resumen.cuotasImpagas} {resumen.cuotasImpagas === 1 ? 'cuota impaga' : 'cuotas impagas'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/socio/apto">
          <Card className="transition-colors hover:bg-secondary">
            <CardContent className="flex items-center gap-3 p-4">
              <Stethoscope
                className={`size-5 shrink-0 ${resumen.apto?.vigente ? 'text-paso-ok' : 'text-muted-foreground'}`}
              />
              <div>
                <div className="font-semibold">
                  {resumen.apto?.vigente ? 'Apto vigente' : 'Sin apto médico'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {resumen.apto?.vigente ? `hasta el ${resumen.apto.hasta}` : 'Necesario para la pileta'}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {resumen.derechos.some((d) => d.tipo === 'DERECHO_PILETA') && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Waves className="size-5 shrink-0 text-paso-ok" />
              <div>
                <div className="font-semibold">Derecho de pileta</div>
                <div className="text-xs text-muted-foreground">
                  hasta el {resumen.derechos.find((d) => d.tipo === 'DERECHO_PILETA')!.hasta}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {resumen.proximas.length > 0 && (
          <Link href="/socio/reservas">
            <Card className="transition-colors hover:bg-secondary">
              <CardContent className="flex items-center gap-3 p-4">
                <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{resumen.proximas[0].que}</div>
                  <div className="text-xs text-muted-foreground">
                    {resumen.proximas[0].predio} ·{' '}
                    {resumen.proximas[0].desde.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Los predios: el corazón de la pantalla */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">¿A dónde vas?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {predios.map((p) => (
            <Link key={p.id} href={`/socio/predio/${p.slug}`} className="group">
              <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-[16/10] bg-secondary">
                  <Image
                    src={fotoDe(p.slug)}
                    alt={p.nombre}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="font-semibold">{p.nombre}</div>
                  {p.direccion && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {p.direccion}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.alojamientos > 0 && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                        {p.alojamientos} alojamientos
                      </span>
                    )}
                    {p.espacios > 0 && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                        {p.espacios} canchas y quinchos
                      </span>
                    )}
                    {p.tienePileta && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">Pileta</span>
                    )}
                    {p.actividades.length > 0 && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                        {p.actividades.length} actividades
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/socio/credencial">Mostrar mi credencial</Link>
        </Button>
      </div>
    </div>
  );
}
