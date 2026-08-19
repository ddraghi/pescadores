import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, BedDouble, MapPin, Trophy, Waves } from 'lucide-react';
import { exigirCapacidad } from '@/lib/auth';
import { predioConDetalle } from '@/lib/datos/socio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabla, Encabezados, Th, Td, Filas, Vacio } from '@/components/panel/tabla';
import { ReservarAlojamiento, ReservarEspacio } from './cliente';

function fotoDe(slug: string): string {
  return slug === 'sede-yrigoyen' ? '/predios/sede-yrigoyen.svg' : `/predios/${slug}.jpg`;
}

const TIPOS_ALOJAMIENTO: Record<string, string> = {
  BUNGALOW: 'Bungalow',
  CABANA: 'Cabaña',
  PARCELA: 'Parcela',
  CARPA: 'Carpa',
  CASILLA: 'Casilla rodante',
  VIVIENDA: 'Vivienda',
};

/**
 * Lo que el socio puede hacer en un predio.
 *
 * Cada predio muestra únicamente lo que tiene: en Camping Valle Grande no aparece
 * «reservar cancha» porque no hay canchas. Eso sale solo de lo que cargó el Secretario,
 * sin programar una pantalla por predio.
 */
export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  await exigirCapacidad('panel_socio');

  const { slug } = await params;
  const predio = await predioConDetalle(slug);
  if (!predio) notFound();

  const actividades = predio.actividades.filter((a) => a.actividad.activo);
  const conPileta = predio.accesos.some((a) => a.exigeAptoMedico);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/socio">
            <ArrowLeft />
            Todos los predios
          </Link>
        </Button>

        <div className="relative aspect-[21/8] overflow-hidden rounded-lg bg-secondary">
          <Image
            src={fotoDe(predio.slug)}
            alt={predio.nombre}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5 text-white">
            <h1 className="text-2xl font-bold sm:text-3xl">{predio.nombre}</h1>
            {predio.direccion && (
              <p className="mt-1 flex items-center gap-1 text-sm opacity-90">
                <MapPin className="size-3.5" />
                {predio.direccion}
              </p>
            )}
          </div>
        </div>
      </div>

      {conPileta && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="size-5" />
              Pileta
            </CardTitle>
            <CardDescription>
              Para entrar hace falta el apto médico vigente y el derecho de temporada, o abonar el
              día en la portería.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/socio/apto">Ver mi apto médico</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {predio.alojamientos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="size-5" />
              Alojamiento
            </CardTitle>
            <CardDescription>Se reserva por noche. Entrada 14, salida 10.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Alojamiento</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Capacidad</Th>
                <Th />
              </Encabezados>
              <Filas>
                {predio.alojamientos.map((a) => (
                  <tr key={a.id}>
                    <Td className="font-medium">{a.nombre}</Td>
                    <Td className="text-sm text-muted-foreground">
                      {TIPOS_ALOJAMIENTO[a.tipo] ?? a.tipo}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {a.capacidadBase}
                      {a.capacidadMax > a.capacidadBase && (
                        <span className="text-muted-foreground"> – {a.capacidadMax}</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <ReservarAlojamiento
                        id={a.id}
                        nombre={a.nombre}
                        capacidadMax={a.capacidadMax}
                      />
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>
      )}

      {predio.espacios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5" />
              Canchas y quinchos
            </CardTitle>
            <CardDescription>
              Las canchas se reservan por hora; los quinchos, por bloque.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabla>
              <Encabezados>
                <Th>Espacio</Th>
                <Th>Tipo</Th>
                <Th>Se reserva</Th>
                <Th />
              </Encabezados>
              <Filas>
                {predio.espacios.map((e) => (
                  <tr key={e.id}>
                    <Td className="font-medium">{e.nombre}</Td>
                    <Td className="text-sm text-muted-foreground">
                      {e.tipo === 'CANCHA' ? 'Cancha' : 'Quincho'}
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {e.unidad === 'BLOQUE' ? `Bloques de ${e.bloqueHoras} h` : 'Por hora'}
                    </Td>
                    <Td className="text-right">
                      <ReservarEspacio
                        id={e.id}
                        nombre={e.nombre}
                        unidad={e.unidad}
                        bloqueHoras={e.bloqueHoras}
                      />
                    </Td>
                  </tr>
                ))}
              </Filas>
            </Tabla>
          </CardContent>
        </Card>
      )}

      {actividades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actividades acá</CardTitle>
            <CardDescription>
              Lo que se dicta en este predio.{' '}
              <Link href="/socio/actividades" className="text-marca underline underline-offset-2">
                Ver todas las del club
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {actividades.map((a) => (
              <span
                key={a.actividadId}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-sm"
              >
                {a.actividad.nombre}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {a.actividad.modalidad === 'mensual' ? 'por mes' : 'por turno'}
                </span>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {predio.alojamientos.length === 0 &&
        predio.espacios.length === 0 &&
        actividades.length === 0 &&
        !conPileta && (
          <Vacio columnas={1}>
            Este predio todavía no tiene nada cargado para reservar.
          </Vacio>
        )}
    </div>
  );
}
