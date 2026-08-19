/**
 * Genera socios de prueba para trabajar con el padrón sin esperar al archivo real.
 *
 *   npm run socios:prueba
 *
 * Incluye a propósito los casos que el estatuto obliga a resolver: cadetes que ya
 * cumplieron 18, activos con más de 30 años de antigüedad y transeúntes con el permiso
 * vencido. Así la pantalla de actos tiene qué mostrar.
 */

import { PrismaClient, CategoriaSocio, EstadoSocio } from '@prisma/client';

const prisma = new PrismaClient();

const APELLIDOS = [
  'Desilvestre', 'Sánchez', 'Villafañe', 'Pluchino', 'Curriol', 'Morbidelli', 'Fajardo',
  'Pérez', 'Piastrelini', 'Pueyo', 'Mora', 'Delpozzi', 'Gijón', 'Rocher', 'Rada',
  'Abaurre', 'Battagion', 'Tosetto', 'Lara', 'Muzi', 'Alonso', 'Ruiz', 'López',
];
const NOMBRES = [
  'Luis', 'Mauricio', 'Juan Carlos', 'Ignacio', 'Jorge', 'Sergio', 'Marcos', 'Matías',
  'Santiago', 'Daniel', 'Carlos', 'Gustavo', 'Ricardo', 'Julio', 'Horacio', 'Eduardo',
  'Ana', 'Marta', 'Lucía', 'Sofía', 'Valeria', 'Carla', 'Mercedes',
];

function haceAnios(n: number, mesesExtra = 0): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  d.setMonth(d.getMonth() - mesesExtra);
  return d;
}

async function main() {
  const mayor = await prisma.socio.aggregate({ _max: { numeroSocio: true } });
  let numero = (mayor._max.numeroSocio ?? 0) + 1;
  let dni = 30000000;
  let creados = 0;

  async function crear(opciones: {
    categoria: CategoriaSocio;
    estado: EstadoSocio;
    ingreso: Date;
    nacimiento?: Date;
    permisoHasta?: Date;
  }) {
    const nombre = `${APELLIDOS[creados % APELLIDOS.length]}, ${NOMBRES[(creados * 7) % NOMBRES.length]}`;
    const documento = String(dni++);
    const existe = await prisma.persona.findUnique({ where: { dni: documento } });
    if (existe) return;

    await prisma.persona.create({
      data: {
        dni: documento,
        nombre,
        fechaNacimiento: opciones.nacimiento ?? haceAnios(35 + (creados % 30)),
        socio: {
          create: {
            numeroSocio: numero++,
            categoria: opciones.categoria,
            estado: opciones.estado,
            fechaIngreso: opciones.ingreso,
            permisoHasta: opciones.permisoHasta ?? null,
          },
        },
      },
    });
    creados += 1;
  }

  // Cuerpo principal del padrón, repartido entre estados.
  const estados: EstadoSocio[] = [
    EstadoSocio.AL_DIA, EstadoSocio.AL_DIA, EstadoSocio.AL_DIA, EstadoSocio.AL_DIA,
    EstadoSocio.MOROSO, EstadoSocio.MOROSO, EstadoSocio.EMPLAZADO, EstadoSocio.LICENCIA,
  ];
  for (let i = 0; i < 48; i++) {
    await crear({
      categoria: i % 9 === 0 ? CategoriaSocio.VITALICIO : CategoriaSocio.ACTIVO,
      estado: estados[i % estados.length],
      ingreso: haceAnios(1 + (i % 25)),
    });
  }

  // Cadetes: algunos chicos, tres que ya cumplieron 18 y hay que pasar a activos.
  for (let i = 0; i < 5; i++) {
    await crear({
      categoria: CategoriaSocio.CADETE,
      estado: EstadoSocio.AL_DIA,
      ingreso: haceAnios(3),
      nacimiento: i < 3 ? haceAnios(19, i) : haceAnios(12 + i),
    });
  }

  // Activos con más de treinta años: candidatos a vitalicio (art. 17 inc. b).
  for (let i = 0; i < 4; i++) {
    await crear({
      categoria: CategoriaSocio.ACTIVO,
      estado: EstadoSocio.AL_DIA,
      ingreso: haceAnios(31 + i),
    });
  }

  // Transeúntes: dos vigentes y dos con el permiso vencido.
  for (let i = 0; i < 4; i++) {
    const vencido = i < 2;
    const hasta = new Date();
    hasta.setDate(hasta.getDate() + (vencido ? -20 - i : 45));
    await crear({
      categoria: CategoriaSocio.TRANSEUNTE,
      estado: EstadoSocio.AL_DIA,
      ingreso: haceAnios(0, 2),
      permisoHasta: hasta,
    });
  }

  // Un cesante y un expulsado, para ver los estados terminales.
  await crear({ categoria: CategoriaSocio.ACTIVO, estado: EstadoSocio.CESANTE, ingreso: haceAnios(8) });
  await crear({ categoria: CategoriaSocio.ACTIVO, estado: EstadoSocio.EXPULSADO, ingreso: haceAnios(12) });

  const total = await prisma.socio.count();
  console.log(`Creados ${creados} socios de prueba. El padrón tiene ahora ${total}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
