/**
 * Dispositivos de prueba, para ver las pantallas funcionando sin aparatos.
 *
 *   npm run dispositivos:prueba
 *
 * Los nombres salen de lo que un club así tiene de verdad: luces de quincho, bombas de
 * la pileta, riego de las canchas, portones. Los identificadores son inventados.
 */

import { PrismaClient, EstadoDispositivo, PropositoDispositivo } from '@prisma/client';

const prisma = new PrismaClient();

interface Fila {
  predio: string;
  nombre: string;
  proposito: PropositoDispositivo;
  ubicacion: string;
  estado?: EstadoDispositivo;
  confirma?: boolean;
  horarios?: { hora: string; encender: boolean; dias?: number[] }[];
}

const P = PropositoDispositivo;

const DISPOSITIVOS: Fila[] = [
  // ── Sede H. Yrigoyen ──
  { predio: 'sede-yrigoyen', nombre: 'Luces del quincho grande', proposito: P.ILUMINACION, ubicacion: 'Tablero del quincho', estado: EstadoDispositivo.APAGADO },
  { predio: 'sede-yrigoyen', nombre: 'Luces canchas de tenis', proposito: P.ILUMINACION, ubicacion: 'Tablero de canchas', estado: EstadoDispositivo.APAGADO,
    horarios: [{ hora: '19:00', encender: true }, { hora: '23:30', encender: false }] },
  { predio: 'sede-yrigoyen', nombre: 'Bomba de la pileta', proposito: P.BOMBA, ubicacion: 'Casilla de máquinas', estado: EstadoDispositivo.ENCENDIDO, confirma: true,
    horarios: [{ hora: '07:00', encender: true }, { hora: '20:00', encender: false }] },
  { predio: 'sede-yrigoyen', nombre: 'Riego del playón', proposito: P.RIEGO, ubicacion: 'Válvula norte', estado: EstadoDispositivo.APAGADO, confirma: true,
    horarios: [{ hora: '06:00', encender: true, dias: [1, 3, 5] }, { hora: '07:30', encender: false, dias: [1, 3, 5] }] },

  // ── Campo de Deportes ──
  { predio: 'campo-deportes', nombre: 'Luces cancha de fútbol', proposito: P.ILUMINACION, ubicacion: 'Torre sur', estado: EstadoDispositivo.APAGADO },
  { predio: 'campo-deportes', nombre: 'Riego cancha de fútbol', proposito: P.RIEGO, ubicacion: 'Casilla de riego', estado: EstadoDispositivo.APAGADO, confirma: true,
    horarios: [{ hora: '05:30', encender: true }, { hora: '06:45', encender: false }] },
  { predio: 'campo-deportes', nombre: 'Bomba del tanque', proposito: P.BOMBA, ubicacion: 'Tanque elevado', confirma: true },

  // ── El Nihuil ──
  { predio: 'nihuil', nombre: 'Luces del camping', proposito: P.ILUMINACION, ubicacion: 'Poste central', estado: EstadoDispositivo.ENCENDIDO,
    horarios: [{ hora: '20:00', encender: true }, { hora: '02:00', encender: false }] },
  { predio: 'nihuil', nombre: 'Luces de los bungalows', proposito: P.ILUMINACION, ubicacion: 'Tablero de bungalows', estado: EstadoDispositivo.APAGADO },
  { predio: 'nihuil', nombre: 'Bomba de agua del camping', proposito: P.BOMBA, ubicacion: 'Casilla junto al muelle', estado: EstadoDispositivo.ENCENDIDO, confirma: true },
  // Sin estado a propósito: así se ve el testigo en SIN_DATO.
  { predio: 'nihuil', nombre: 'Luces del muelle', proposito: P.ILUMINACION, ubicacion: 'Muelle' },

  // ── Valle Grande ──
  { predio: 'lago-valle-grande', nombre: 'Portón bajada de lanchas', proposito: P.ACCESO, ubicacion: 'Rampa', estado: EstadoDispositivo.APAGADO },
  { predio: 'camping-valle-grande', nombre: 'Luces del camping', proposito: P.ILUMINACION, ubicacion: 'Poste de entrada', estado: EstadoDispositivo.APAGADO },
];

async function main() {
  const predios = Object.fromEntries(
    (await prisma.predio.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]),
  );

  let creados = 0;
  let horariosCreados = 0;

  for (const [i, d] of DISPOSITIVOS.entries()) {
    const predioId = predios[d.predio];
    if (!predioId) continue;

    const deviceId = `100${String(12000 + i)}ab`;
    const existe = await prisma.dispositivo.findUnique({ where: { deviceId } });
    if (existe) continue;

    const dispositivo = await prisma.dispositivo.create({
      data: {
        predioId,
        nombre: d.nombre,
        deviceId,
        proposito: d.proposito,
        via: 'sonoff_lan',
        direccion: `192.168.1.${50 + i}`,
        ubicacion: d.ubicacion,
        requiereConfirmacion: d.confirma ?? false,
        estado: d.estado ?? EstadoDispositivo.SIN_DATO,
        estadoEn: d.estado ? new Date() : null,
      },
    });
    creados += 1;

    for (const h of d.horarios ?? []) {
      await prisma.horarioDispositivo.create({
        data: {
          dispositivoId: dispositivo.id,
          hora: h.hora,
          encender: h.encender,
          dias: h.dias ?? [],
        },
      });
      horariosCreados += 1;
    }
  }

  console.log(`\nCreados ${creados} dispositivos y ${horariosCreados} horarios.`);
  console.log('«Luces del muelle» quedó sin estado a propósito, para ver el testigo en SIN_DATO.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
