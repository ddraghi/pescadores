/**
 * Semilla de desarrollo.
 *
 * Carga la estructura REAL del club —los cinco predios y sus instalaciones, tomados
 * del tarifario vigente— y una persona por cada rol para poder probar los permisos.
 * Los datos de las personas son inventados; los predios y las instalaciones no.
 *
 *   npm run db:seed
 */

import { PrismaClient, Rol, TipoAcceso, TipoAlojamiento, TipoEspacio, UnidadReserva } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Contraseña única para todas las cuentas de prueba. Sólo desarrollo. */
const CLAVE_DEMO = 'pescadores';

async function main() {
  console.log('Sembrando…');

  const hash = await bcrypt.hash(CLAVE_DEMO, 10);

  // ── Predios ────────────────────────────────────────────────────────────────
  // Los tres remotos van por Starlink: ahí el nodo local es obligatorio.
  const predios = [
    { slug: 'sede-yrigoyen',        nombre: 'Sede H. Yrigoyen',        direccion: 'H. Yrigoyen 3524, San Rafael', conexionSatelital: false, orden: 1 },
    { slug: 'campo-deportes',       nombre: 'Campo de Deportes',       direccion: 'Rawson y Alsina, San Rafael',  conexionSatelital: false, orden: 2 },
    { slug: 'nihuil',               nombre: 'El Nihuil',               direccion: 'Embalse El Nihuil',            conexionSatelital: true,  orden: 3 },
    { slug: 'camping-valle-grande', nombre: 'Camping Valle Grande',    direccion: 'Ruta 173, Valle Grande',       conexionSatelital: true,  orden: 4 },
    { slug: 'lago-valle-grande',    nombre: 'Lago Valle Grande',       direccion: 'Cañón del Atuel',              conexionSatelital: true,  orden: 5 },
  ];

  for (const p of predios) {
    await prisma.predio.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  const porSlug = Object.fromEntries(
    (await prisma.predio.findMany()).map((p) => [p.slug, p]),
  );
  console.log(`  ${predios.length} predios`);

  // ── Accesos ────────────────────────────────────────────────────────────────
  // Portería general en cada predio, más los puntos de control de las zonas que el
  // tarifario cobra aparte: pileta, gimnasio y bajada de lanchas.
  const accesos: { predio: string; nombre: string; tipo: TipoAcceso; dispositivoTipo: string }[] = [
    { predio: 'sede-yrigoyen',        nombre: 'Portería principal',  tipo: TipoAcceso.PORTERIA, dispositivoTipo: 'relay_usb' },
    { predio: 'sede-yrigoyen',        nombre: 'Control pileta',      tipo: TipoAcceso.CONTROL,  dispositivoTipo: 'sonoff_lan' },
    { predio: 'sede-yrigoyen',        nombre: 'Control gimnasio',    tipo: TipoAcceso.CONTROL,  dispositivoTipo: 'sonoff_lan' },
    { predio: 'campo-deportes',       nombre: 'Portería principal',  tipo: TipoAcceso.PORTERIA, dispositivoTipo: 'relay_usb' },
    { predio: 'campo-deportes',       nombre: 'Control pileta',      tipo: TipoAcceso.CONTROL,  dispositivoTipo: 'sonoff_lan' },
    { predio: 'nihuil',               nombre: 'Portería principal',  tipo: TipoAcceso.PORTERIA, dispositivoTipo: 'relay_usb' },
    { predio: 'camping-valle-grande', nombre: 'Portería principal',  tipo: TipoAcceso.PORTERIA, dispositivoTipo: 'relay_usb' },
    { predio: 'lago-valle-grande',    nombre: 'Portería principal',  tipo: TipoAcceso.PORTERIA, dispositivoTipo: 'relay_usb' },
    { predio: 'lago-valle-grande',    nombre: 'Bajada de lanchas',   tipo: TipoAcceso.CONTROL,  dispositivoTipo: 'sonoff_lan' },
  ];

  for (const a of accesos) {
    const predioId = porSlug[a.predio].id;
    const existe = await prisma.acceso.findFirst({ where: { predioId, nombre: a.nombre } });
    if (!existe) {
      await prisma.acceso.create({
        data: { predioId, nombre: a.nombre, tipo: a.tipo, dispositivoTipo: a.dispositivoTipo },
      });
    }
  }
  console.log(`  ${accesos.length} accesos`);

  // ── Alojamientos del Nihuil ────────────────────────────────────────────────
  // Numeración y capacidades tal como figuran en el tarifario vigente.
  const nihuil = porSlug['nihuil'].id;
  const alojamientos = [
    { nombre: 'Bungalow 1', tipo: TipoAlojamiento.BUNGALOW, capacidadBase: 4, capacidadMax: 4 },
    { nombre: 'Bungalow 2', tipo: TipoAlojamiento.BUNGALOW, capacidadBase: 4, capacidadMax: 4 },
    { nombre: 'Bungalow 4', tipo: TipoAlojamiento.BUNGALOW, capacidadBase: 8, capacidadMax: 8 },
    { nombre: 'Bungalow 5', tipo: TipoAlojamiento.BUNGALOW, capacidadBase: 6, capacidadMax: 6 },
    { nombre: 'Bungalow 6', tipo: TipoAlojamiento.BUNGALOW, capacidadBase: 6, capacidadMax: 6 },
    { nombre: 'Bungalow 7', tipo: TipoAlojamiento.BUNGALOW, capacidadBase: 6, capacidadMax: 6 },
    { nombre: 'Cabaña 8',   tipo: TipoAlojamiento.CABANA,   capacidadBase: 6, capacidadMax: 6 },
    { nombre: 'Cabaña 9',   tipo: TipoAlojamiento.CABANA,   capacidadBase: 6, capacidadMax: 6 },
  ];
  for (const al of alojamientos) {
    const existe = await prisma.alojamiento.findFirst({ where: { predioId: nihuil, nombre: al.nombre } });
    if (!existe) await prisma.alojamiento.create({ data: { ...al, predioId: nihuil } });
  }
  console.log(`  ${alojamientos.length} alojamientos`);

  // ── Espacios ───────────────────────────────────────────────────────────────
  // Canchas por hora; quinchos por bloque de 5 h más hora adicional (tarifario).
  const espacios: { predio: string; nombre: string; tipo: TipoEspacio; unidad: UnidadReserva; bloqueHoras?: number; altaDemanda: boolean }[] = [
    { predio: 'sede-yrigoyen',  nombre: 'Cancha de tenis 1', tipo: TipoEspacio.CANCHA,  unidad: UnidadReserva.HORA,   altaDemanda: true },
    { predio: 'sede-yrigoyen',  nombre: 'Cancha de tenis 2', tipo: TipoEspacio.CANCHA,  unidad: UnidadReserva.HORA,   altaDemanda: true },
    { predio: 'sede-yrigoyen',  nombre: 'Cancha de pádel',   tipo: TipoEspacio.CANCHA,  unidad: UnidadReserva.HORA,   altaDemanda: true },
    { predio: 'sede-yrigoyen',  nombre: 'Cancha playón',     tipo: TipoEspacio.CANCHA,  unidad: UnidadReserva.HORA,   altaDemanda: false },
    { predio: 'sede-yrigoyen',  nombre: 'Quincho grande',    tipo: TipoEspacio.QUINCHO, unidad: UnidadReserva.BLOQUE, bloqueHoras: 5, altaDemanda: true },
    { predio: 'sede-yrigoyen',  nombre: 'Quincho chico',     tipo: TipoEspacio.QUINCHO, unidad: UnidadReserva.BLOQUE, bloqueHoras: 5, altaDemanda: true },
    { predio: 'campo-deportes', nombre: 'Cancha de fútbol',  tipo: TipoEspacio.CANCHA,  unidad: UnidadReserva.HORA,   altaDemanda: true },
    { predio: 'campo-deportes', nombre: 'Fútbol 5 sintético',tipo: TipoEspacio.CANCHA,  unidad: UnidadReserva.HORA,   altaDemanda: true },
    { predio: 'campo-deportes', nombre: 'Cancha de hockey',  tipo: TipoEspacio.CANCHA,  unidad: UnidadReserva.HORA,   altaDemanda: false },
    { predio: 'campo-deportes', nombre: 'Quincho',           tipo: TipoEspacio.QUINCHO, unidad: UnidadReserva.BLOQUE, bloqueHoras: 5, altaDemanda: true },
  ];
  for (const e of espacios) {
    const predioId = porSlug[e.predio].id;
    const existe = await prisma.espacio.findFirst({ where: { predioId, nombre: e.nombre } });
    if (!existe) {
      const { predio: _p, ...datos } = e;
      await prisma.espacio.create({ data: { ...datos, predioId } });
    }
  }
  console.log(`  ${espacios.length} espacios`);

  // ── Actividades ────────────────────────────────────────────────────────────
  const actividades = [
    { nombre: 'Fútbol',    modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Hockey',    modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Rugby',     modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Handball',  modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Futsal',    modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Natación',  modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Kayak',     modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Running',   modalidad: 'mensual', predios: ['campo-deportes'] },
    { nombre: 'Tenis',     modalidad: 'mensual', predios: ['sede-yrigoyen'] },
    { nombre: 'Pádel',     modalidad: 'turno',   predios: ['sede-yrigoyen'] },
    { nombre: 'Patín',     modalidad: 'mensual', predios: ['sede-yrigoyen'] },
    { nombre: 'Gimnasio',  modalidad: 'mensual', predios: ['sede-yrigoyen'] },
    { nombre: 'Aikido',    modalidad: 'mensual', predios: ['sede-yrigoyen'] },
    { nombre: 'Adultos mayores', modalidad: 'mensual', predios: ['sede-yrigoyen'] },
    { nombre: 'Colonia de verano',   modalidad: 'mensual', predios: ['sede-yrigoyen', 'campo-deportes'] },
    { nombre: 'Guardería de verano', modalidad: 'mensual', predios: ['sede-yrigoyen', 'campo-deportes'] },
  ];
  for (const a of actividades) {
    const existe = await prisma.actividad.findFirst({ where: { nombre: a.nombre } });
    if (existe) continue;
    await prisma.actividad.create({
      data: {
        nombre: a.nombre,
        modalidad: a.modalidad,
        predios: { create: a.predios.map((s) => ({ predioId: porSlug[s].id })) },
      },
    });
  }
  console.log(`  ${actividades.length} actividades`);

  // ── Personas de prueba, una por rol ────────────────────────────────────────
  const cuentas: { usuario: string; nombre: string; dni: string; rol: Rol; predio?: string }[] = [
    { usuario: 'admin',      nombre: 'Administrador General', dni: '10000001', rol: Rol.ADMIN_GENERAL },
    { usuario: 'secretario', nombre: 'Secretario del Club',   dni: '10000002', rol: Rol.SECRETARIO },
    { usuario: 'tesorero',   nombre: 'Tesorero del Club',     dni: '10000003', rol: Rol.TESORERO },
    { usuario: 'cobrador',   nombre: 'Cobrador a domicilio',  dni: '10000004', rol: Rol.COBRADOR },
    { usuario: 'jefenihuil', nombre: 'Jefe de El Nihuil',     dni: '10000005', rol: Rol.JEFE_PREDIO, predio: 'nihuil' },
    { usuario: 'portero',    nombre: 'Portero de El Nihuil',  dni: '10000006', rol: Rol.PORTERO,     predio: 'nihuil' },
    { usuario: 'control',    nombre: 'Control de pileta',     dni: '10000007', rol: Rol.CONTROL_PASO, predio: 'sede-yrigoyen' },
    { usuario: 'maestranza', nombre: 'Personal de maestranza', dni: '10000008', rol: Rol.MAESTRANZA, predio: 'sede-yrigoyen' },
    { usuario: 'medico',     nombre: 'Médico del club',       dni: '10000009', rol: Rol.MEDICO },
    { usuario: 'profesor',   nombre: 'Profesor de natación',  dni: '10000010', rol: Rol.PROFESOR },
    { usuario: 'concesion',  nombre: 'Concesionario cantina', dni: '10000011', rol: Rol.CONCESIONARIO, predio: 'nihuil' },
  ];

  for (const c of cuentas) {
    const persona = await prisma.persona.upsert({
      where: { dni: c.dni },
      update: { nombre: c.nombre, usuario: c.usuario, passwordHash: hash },
      create: { dni: c.dni, nombre: c.nombre, usuario: c.usuario, passwordHash: hash },
    });
    const predioId = c.predio ? porSlug[c.predio].id : null;
    const yaTiene = await prisma.rolAsignado.findFirst({
      where: { personaId: persona.id, rol: c.rol, predioId },
    });
    if (!yaTiene) {
      await prisma.rolAsignado.create({ data: { personaId: persona.id, rol: c.rol, predioId } });
    }
  }
  console.log(`  ${cuentas.length} cuentas de staff`);

  // ── Un socio de prueba ─────────────────────────────────────────────────────
  const personaSocio = await prisma.persona.upsert({
    where: { dni: '20000001' },
    update: {},
    create: {
      dni: '20000001',
      nombre: 'Socio de Prueba',
      usuario: 'socio',
      passwordHash: hash,
      email: 'socio@ejemplo.com',
    },
  });
  await prisma.socio.upsert({
    where: { personaId: personaSocio.id },
    update: {},
    create: { personaId: personaSocio.id, numeroSocio: 1, fechaIngreso: new Date('2015-03-01') },
  });
  const tieneRolSocio = await prisma.rolAsignado.findFirst({
    where: { personaId: personaSocio.id, rol: Rol.SOCIO, predioId: null },
  });
  if (!tieneRolSocio) {
    await prisma.rolAsignado.create({ data: { personaId: personaSocio.id, rol: Rol.SOCIO } });
  }
  console.log('  1 socio');

  console.log(`\nListo. Todas las cuentas usan la contraseña: ${CLAVE_DEMO}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
