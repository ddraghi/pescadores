/**
 * Prueba de la resolución de precios.
 *
 *   npm run probar:tarifario
 *
 * Los casos salen del tarifario real del club (diciembre 2025 – enero 2026): la entrada
 * cuesta distinto en cada predio, el socio no paga y el no socio sí, y hay conceptos que
 * valen para todos los predios a la vez.
 */

import { resolverPrecio, type ItemPrecio } from '../src/lib/tarifario';

let fallas = 0;

function comprobar(que: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas += 1;
  const detalle = ok ? '' : `  (esperaba ${JSON.stringify(esperado)})`;
  console.log(`${ok ? '  ok ' : ' MAL '} ${que} → ${JSON.stringify(real)}${detalle}`);
}

const NIHUIL = 'predio-nihuil';
const LAGO = 'predio-lago';

const d = (s: string) => new Date(`${s}T00:00:00`);

const tarifario: ItemPrecio[] = [
  // Entrada: gratis para el socio, con precio por predio para el no socio.
  { id: '1', concepto: 'Entrada', predioId: NIHUIL, condicion: 'SOCIO', precio: 0, vigenciaDesde: d('2025-12-01'), vigenciaHasta: null },
  { id: '2', concepto: 'Entrada', predioId: NIHUIL, condicion: 'NO_SOCIO', precio: 7000, vigenciaDesde: d('2025-12-01'), vigenciaHasta: null },
  { id: '3', concepto: 'Entrada', predioId: LAGO, condicion: 'NO_SOCIO', precio: 8000, vigenciaDesde: d('2025-12-01'), vigenciaHasta: null },
  { id: '4', concepto: 'Entrada', predioId: NIHUIL, condicion: 'JUBILADO', precio: 4000, vigenciaDesde: d('2025-12-01'), vigenciaHasta: null },

  // Un precio del temporada anterior, ya vencido: no tiene que ganar nunca.
  { id: '5', concepto: 'Entrada', predioId: NIHUIL, condicion: 'NO_SOCIO', precio: 3500, vigenciaDesde: d('2024-12-01'), vigenciaHasta: d('2025-11-30') },

  // Derecho de pileta: vale para todos los predios (sin predio puntual).
  { id: '6', concepto: 'Derecho de pileta', predioId: null, condicion: 'SOCIO', precio: 95000, vigenciaDesde: d('2025-12-01'), vigenciaHasta: null },
  // Pero en el lago tiene un precio propio que le tiene que ganar al general.
  { id: '7', concepto: 'Derecho de pileta', predioId: LAGO, condicion: 'SOCIO', precio: 120000, vigenciaDesde: d('2025-12-01'), vigenciaHasta: null },

  // Cuota social por categoría. Los vitalicios NO tienen precio cargado a propósito.
  { id: '8', concepto: 'Cuota social', predioId: null, condicion: 'SOCIO', precio: 12000, vigenciaDesde: d('2026-01-01'), vigenciaHasta: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: false },
  { id: '9', concepto: 'Cuota social', predioId: null, condicion: 'SOCIO', precio: 20000, vigenciaDesde: d('2026-01-01'), vigenciaHasta: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: true },
  { id: '10', concepto: 'Cuota social', predioId: null, condicion: 'SOCIO', precio: 6000, vigenciaDesde: d('2026-01-01'), vigenciaHasta: null, categoriaSocio: 'CADETE', porGrupoFamiliar: false },

  // Aumento de la cuota del activo a partir de agosto.
  { id: '11', concepto: 'Cuota social', predioId: null, condicion: 'SOCIO', precio: 18000, vigenciaDesde: d('2026-08-01'), vigenciaHasta: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: false },
];

const precio = (c: Parameters<typeof resolverPrecio>[1]) => resolverPrecio(tarifario, c)?.precio ?? null;
const hoy = d('2026-08-19');

console.log('\nEntrada, según predio y condición');
comprobar('socio en el Nihuil      ', precio({ concepto: 'Entrada', predioId: NIHUIL, condicion: 'SOCIO', fecha: hoy }), 0);
comprobar('no socio en el Nihuil   ', precio({ concepto: 'Entrada', predioId: NIHUIL, condicion: 'NO_SOCIO', fecha: hoy }), 7000);
comprobar('no socio en el lago     ', precio({ concepto: 'Entrada', predioId: LAGO, condicion: 'NO_SOCIO', fecha: hoy }), 8000);
comprobar('jubilado en el Nihuil   ', precio({ concepto: 'Entrada', predioId: NIHUIL, condicion: 'JUBILADO', fecha: hoy }), 4000);
comprobar('socio en el lago (no hay)', precio({ concepto: 'Entrada', predioId: LAGO, condicion: 'SOCIO', fecha: hoy }), null);

console.log('\nEl precio vencido de la temporada anterior no gana');
comprobar('hoy                     ', precio({ concepto: 'Entrada', predioId: NIHUIL, condicion: 'NO_SOCIO', fecha: hoy }), 7000);
comprobar('pero en marzo de 2025 sí', precio({ concepto: 'Entrada', predioId: NIHUIL, condicion: 'NO_SOCIO', fecha: d('2025-03-15') }), 3500);

console.log('\nEl precio del predio le gana al general');
comprobar('pileta en el lago       ', precio({ concepto: 'Derecho de pileta', predioId: LAGO, condicion: 'SOCIO', fecha: hoy }), 120000);
comprobar('pileta en el Nihuil     ', precio({ concepto: 'Derecho de pileta', predioId: NIHUIL, condicion: 'SOCIO', fecha: hoy }), 95000);

console.log('\nCuota social');
comprobar('activo individual       ', precio({ concepto: 'Cuota social', predioId: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: false, fecha: hoy }), 18000);
comprobar('activo grupo familiar   ', precio({ concepto: 'Cuota social', predioId: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: true, fecha: hoy }), 20000);
comprobar('cadete                  ', precio({ concepto: 'Cuota social', predioId: null, categoriaSocio: 'CADETE', porGrupoFamiliar: false, fecha: hoy }), 6000);
comprobar('vitalicio: no paga      ', precio({ concepto: 'Cuota social', predioId: null, categoriaSocio: 'VITALICIO', porGrupoFamiliar: false, fecha: hoy }), null);

console.log('\nEl aumento entra en vigencia sin pisar el pasado');
comprobar('activo en marzo de 2026 ', precio({ concepto: 'Cuota social', predioId: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: false, fecha: d('2026-03-10') }), 12000);
comprobar('activo en agosto de 2026', precio({ concepto: 'Cuota social', predioId: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: false, fecha: d('2026-08-10') }), 18000);

console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} comprobaciones fallaron.\n`);
process.exit(fallas === 0 ? 0 : 1);
