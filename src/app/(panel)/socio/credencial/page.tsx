import Image from 'next/image';
import QRCode from 'qrcode';
import { exigirCapacidad } from '@/lib/auth';
import { socioDeSesion, resumenDelSocio } from '@/lib/datos/socio';
import { Card, CardContent } from '@/components/ui/card';
import { CATEGORIAS, ESTADOS, type NombreCategoria, type NombreEstado } from '@/lib/socios';

/**
 * Credencial del socio.
 *
 * El QR lleva el número de socio y nada más: no viaja ningún dato personal, y el puesto
 * de acceso resuelve el resto contra la base. Si alguien fotografía el código, no
 * obtiene nada que no esté en el carnet de cartón.
 *
 * Se renderiza en el servidor y viaja como imagen dentro del HTML: así la credencial se
 * ve aunque el celular no tenga señal, que es exactamente lo que pasa en el Nihuil.
 */
export default async function Pagina() {
  const sesion = await exigirCapacidad('panel_socio');
  const socio = await socioDeSesion(sesion);

  if (!socio) {
    return (
      <p className="rounded-md border border-border bg-card px-4 py-8 text-center text-muted-foreground">
        Tu ficha de socio todavía no está cargada.
      </p>
    );
  }

  const resumen = await resumenDelSocio(socio.id);

  const contenido = JSON.stringify({ tipo: 'socio', nro: socio.numeroSocio });
  const qr = await QRCode.toDataURL(contenido, {
    width: 520,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const alDia = socio.estado === 'AL_DIA';

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between bg-black px-5 py-3">
          <Image
            src="/logo-club.png"
            alt="Club de Pescadores San Rafael"
            width={160}
            height={31}
            className="h-6 w-auto"
          />
          <span className="font-mono text-xs text-white/70">SOCIO</span>
        </div>

        <CardContent className="flex flex-col items-center gap-4 p-5">
          {/* El QR grande y con fondo blanco fijo: tiene que leerse de noche, en la
              tranquera, con la pantalla al mínimo de brillo. */}
          <div className="rounded-lg bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`Código de socio ${socio.numeroSocio}`} className="size-52" />
          </div>

          <div className="text-center">
            <div className="font-mono text-4xl font-bold tabular-nums">{socio.numeroSocio}</div>
            <div className="mt-1 text-lg font-semibold">{socio.persona.nombre}</div>
            <div className="text-sm text-muted-foreground">DNI {socio.persona.dni}</div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs">
              {CATEGORIAS[socio.categoria as NombreCategoria]}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                alDia
                  ? 'border-paso-ok bg-paso-ok/15 text-foreground'
                  : 'border-accent bg-accent/10 text-marca'
              }`}
            >
              {ESTADOS[socio.estado as NombreEstado]}
            </span>
            {resumen.apto?.vigente && (
              <span className="rounded-full border border-paso-ok bg-paso-ok/15 px-3 py-1 text-xs">
                Apto médico vigente
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Mostrá esta pantalla en la portería. Funciona sin señal: el código no cambia.
      </p>
    </div>
  );
}
