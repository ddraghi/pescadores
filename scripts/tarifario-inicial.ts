/**
 * Carga el tarifario del club.
 *
 *   npm run tarifario:inicial
 *
 * Los precios de entradas, alojamiento, pileta y quinchos son los REALES del tarifario
 * vigente que publica el club (diciembre 2025 – enero 2026).
 *
 * La CUOTA SOCIAL es la excepción: el tarifario publicado no la incluye, así que los
 * valores que carga este script son inventados para poder probar la generación mensual.
 * Hay que reemplazarlos por los que fije la asamblea (art. 72 inc. c).
 */

import { PrismaClient, CategoriaSocio, CondicionPersona, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const DESDE = new Date('2025-12-01T00:00:00');

interface Fila {
  concepto: string;
  predio: string | null;
  condicion: CondicionPersona;
  precio: number;
  categoria?: CategoriaSocio;
  grupo?: boolean;
}

const S = CondicionPersona.SOCIO;
const NS = CondicionPersona.NO_SOCIO;
const JUB = CondicionPersona.JUBILADO;
const ACOMP = CondicionPersona.ACOMPANANTE;
const INV = CondicionPersona.INVITADO;

const TARIFAS: Fila[] = [
  // ── El Nihuil ──
  { concepto: 'Entrada', predio: 'nihuil', condicion: S, precio: 0 },
  { concepto: 'Entrada', predio: 'nihuil', condicion: NS, precio: 7000 },
  { concepto: 'Entrada', predio: 'nihuil', condicion: JUB, precio: 4000 },
  { concepto: 'Carpa', predio: 'nihuil', condicion: S, precio: 7500 },
  { concepto: 'Carpa', predio: 'nihuil', condicion: NS, precio: 22500 },
  { concepto: 'Casilla rodante', predio: 'nihuil', condicion: S, precio: 14500 },
  { concepto: 'Casilla rodante', predio: 'nihuil', condicion: NS, precio: 35000 },
  { concepto: 'Bungalow', predio: 'nihuil', condicion: S, precio: 60000 },
  { concepto: 'Bungalow', predio: 'nihuil', condicion: NS, precio: 104000 },
  { concepto: 'Cabaña', predio: 'nihuil', condicion: S, precio: 70000 },
  { concepto: 'Cabaña', predio: 'nihuil', condicion: NS, precio: 116000 },
  { concepto: 'Estadía en viviendas', predio: 'nihuil', condicion: S, precio: 0 },
  { concepto: 'Estadía en viviendas', predio: 'nihuil', condicion: NS, precio: 5000 },

  // ── Camping Valle Grande ──
  { concepto: 'Entrada', predio: 'camping-valle-grande', condicion: S, precio: 0 },
  { concepto: 'Entrada', predio: 'camping-valle-grande', condicion: NS, precio: 8000 },
  { concepto: 'Entrada', predio: 'camping-valle-grande', condicion: JUB, precio: 4000 },
  { concepto: 'Entrada', predio: 'camping-valle-grande', condicion: ACOMP, precio: 6000 },
  { concepto: 'Carpa', predio: 'camping-valle-grande', condicion: S, precio: 10000 },
  { concepto: 'Carpa', predio: 'camping-valle-grande', condicion: NS, precio: 30000 },
  { concepto: 'Casilla rodante', predio: 'camping-valle-grande', condicion: S, precio: 20000 },
  { concepto: 'Casilla rodante', predio: 'camping-valle-grande', condicion: NS, precio: 45000 },

  // ── Lago Valle Grande ──
  { concepto: 'Entrada', predio: 'lago-valle-grande', condicion: S, precio: 0 },
  { concepto: 'Entrada', predio: 'lago-valle-grande', condicion: NS, precio: 8000 },
  { concepto: 'Entrada', predio: 'lago-valle-grande', condicion: JUB, precio: 4000 },
  { concepto: 'Entrada', predio: 'lago-valle-grande', condicion: ACOMP, precio: 6000 },
  { concepto: 'Estacionamiento', predio: 'lago-valle-grande', condicion: NS, precio: 10000 },
  { concepto: 'Carpa', predio: 'lago-valle-grande', condicion: S, precio: 10000 },
  { concepto: 'Carpa', predio: 'lago-valle-grande', condicion: NS, precio: 35000 },
  { concepto: 'Casilla rodante', predio: 'lago-valle-grande', condicion: S, precio: 20000 },
  { concepto: 'Casilla rodante', predio: 'lago-valle-grande', condicion: NS, precio: 50000 },
  { concepto: 'Bajada de lancha', predio: 'lago-valle-grande', condicion: S, precio: 9000 },
  { concepto: 'Bajada de lancha', predio: 'lago-valle-grande', condicion: NS, precio: 25000 },

  // ── Campo de Deportes ──
  { concepto: 'Entrada', predio: 'campo-deportes', condicion: S, precio: 0 },
  { concepto: 'Entrada', predio: 'campo-deportes', condicion: NS, precio: 25000 },
  { concepto: 'Entrada sólo camping', predio: 'campo-deportes', condicion: NS, precio: 5000 },
  { concepto: 'Entrada', predio: 'campo-deportes', condicion: JUB, precio: 10000 },
  { concepto: 'Día de pileta', predio: 'campo-deportes', condicion: S, precio: 7000 },
  { concepto: 'Día de pileta', predio: 'campo-deportes', condicion: INV, precio: 12000 },
  { concepto: 'Quincho', predio: 'campo-deportes', condicion: S, precio: 52000 },
  { concepto: 'Hora adicional de quincho', predio: 'campo-deportes', condicion: S, precio: 15000 },
  { concepto: 'Estacionamiento', predio: 'campo-deportes', condicion: NS, precio: 2000 },

  // ── Sede H. Yrigoyen ──
  { concepto: 'Entrada', predio: 'sede-yrigoyen', condicion: S, precio: 0 },
  { concepto: 'Entrada', predio: 'sede-yrigoyen', condicion: NS, precio: 25000 },
  { concepto: 'Entrada sólo camping', predio: 'sede-yrigoyen', condicion: NS, precio: 5000 },
  { concepto: 'Día de pileta', predio: 'sede-yrigoyen', condicion: S, precio: 7000 },
  { concepto: 'Día de pileta', predio: 'sede-yrigoyen', condicion: INV, precio: 12000 },
  { concepto: 'Quincho', predio: 'sede-yrigoyen', condicion: S, precio: 40000 },
  { concepto: 'Hora adicional de quincho', predio: 'sede-yrigoyen', condicion: S, precio: 11000 },
  { concepto: 'Estacionamiento', predio: 'sede-yrigoyen', condicion: NS, precio: 2000 },

  // ── Válidos para todos los predios ──
  // El tarifario aclara que estos dos valen para los dos predios de la ciudad.
  { concepto: 'Derecho de pileta', predio: null, condicion: S, precio: 95000 },
  { concepto: 'Revisación de enfermería', predio: null, condicion: S, precio: 5000 },

  // ── Cuota social: VALORES INVENTADOS, hay que reemplazarlos ──
  { concepto: 'Cuota social', predio: null, condicion: S, precio: 12000, categoria: CategoriaSocio.ACTIVO },
  { concepto: 'Cuota social', predio: null, condicion: S, precio: 20000, categoria: CategoriaSocio.ACTIVO, grupo: true },
  { concepto: 'Cuota social', predio: null, condicion: S, precio: 6000, categoria: CategoriaSocio.CADETE },
  { concepto: 'Cuota social', predio: null, condicion: S, precio: 9000, categoria: CategoriaSocio.TRANSEUNTE },
  // Vitalicios y honorarios NO llevan fila: por eso no se les genera cuota.
];

async function main() {
  const predios = Object.fromEntries(
    (await prisma.predio.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]),
  );

  let cargados = 0;
  let existentes = 0;

  for (const t of TARIFAS) {
    const predioId = t.predio ? predios[t.predio] : null;
    if (t.predio && !predioId) {
      console.warn(`  sin predio "${t.predio}", se saltea ${t.concepto}`);
      continue;
    }

    const ya = await prisma.itemTarifario.findFirst({
      where: {
        concepto: t.concepto,
        predioId,
        condicion: t.condicion,
        categoriaSocio: t.categoria ?? null,
        porGrupoFamiliar: t.grupo ?? false,
        vigenciaHasta: null,
      },
    });
    if (ya) {
      existentes += 1;
      continue;
    }

    await prisma.itemTarifario.create({
      data: {
        concepto: t.concepto,
        predioId,
        condicion: t.condicion,
        precio: new Prisma.Decimal(t.precio),
        vigenciaDesde: DESDE,
        categoriaSocio: t.categoria ?? null,
        porGrupoFamiliar: t.grupo ?? false,
      },
    });
    cargados += 1;
  }

  console.log(`\nTarifario: ${cargados} precios cargados, ${existentes} ya estaban.`);
  console.log('Los precios de entradas, alojamiento, pileta y quinchos son los del');
  console.log('tarifario vigente del club.');
  console.log('\nATENCIÓN: los cuatro precios de CUOTA SOCIAL son inventados —el tarifario');
  console.log('publicado no la incluye— y hay que reemplazarlos por los que fije la asamblea.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
