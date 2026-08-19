/**
 * Prueba de a quién se le genera cuota y por cuánto.
 *
 *   npm run probar:cuotas
 *
 * Sin base de datos. Los casos son los que el estatuto obliga a tratar distinto: el
 * socio en licencia, el grupo familiar, y las categorías sin precio cargado.
 */

import { calcularCuotasDelPeriodo, type SocioParaCuota } from '../src/lib/cuotas';
import type { ItemPrecio } from '../src/lib/tarifario';

let fallas = 0;

function comprobar(que: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas += 1;
  const detalle = ok ? '' : `  (esperaba ${JSON.stringify(esperado)})`;
  console.log(`${ok ? '  ok ' : ' MAL '} ${que} → ${JSON.stringify(real)}${detalle}`);
}

const d = (s: string) => new Date(`${s}T00:00:00`);
const enero = d('2026-01-01');

const tarifario: ItemPrecio[] = [
  { id: 'a', concepto: 'Cuota social', predioId: null, condicion: 'SOCIO', precio: 12000, vigenciaDesde: d('2025-01-01'), vigenciaHasta: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: false },
  { id: 'b', concepto: 'Cuota social', predioId: null, condicion: 'SOCIO', precio: 20000, vigenciaDesde: d('2025-01-01'), vigenciaHasta: null, categoriaSocio: 'ACTIVO', porGrupoFamiliar: true },
  { id: 'c', concepto: 'Cuota social', predioId: null, condicion: 'SOCIO', precio: 6000, vigenciaDesde: d('2025-01-01'), vigenciaHasta: null, categoriaSocio: 'CADETE', porGrupoFamiliar: false },
  // VITALICIO y HONORARIO no llevan fila a propósito: así se define que no pagan.
];

const socios: SocioParaCuota[] = [
  { id: 'activo-suelto', categoria: 'ACTIVO', estado: 'AL_DIA', titularId: null, familiares: 0 },
  { id: 'activo-moroso', categoria: 'ACTIVO', estado: 'MOROSO', titularId: null, familiares: 0 },
  { id: 'cadete', categoria: 'CADETE', estado: 'AL_DIA', titularId: null, familiares: 0 },
  { id: 'vitalicio', categoria: 'VITALICIO', estado: 'AL_DIA', titularId: null, familiares: 0 },
  { id: 'honorario', categoria: 'HONORARIO', estado: 'AL_DIA', titularId: null, familiares: 0 },
  { id: 'en-licencia', categoria: 'ACTIVO', estado: 'LICENCIA', titularId: null, familiares: 0 },
  { id: 'cesante', categoria: 'ACTIVO', estado: 'CESANTE', titularId: null, familiares: 0 },
  { id: 'expulsado', categoria: 'ACTIVO', estado: 'EXPULSADO', titularId: null, familiares: 0 },
  { id: 'titular', categoria: 'ACTIVO', estado: 'AL_DIA', titularId: null, familiares: 2 },
  { id: 'esposa', categoria: 'ACTIVO', estado: 'AL_DIA', titularId: 'titular', familiares: 0 },
  { id: 'hijo', categoria: 'CADETE', estado: 'AL_DIA', titularId: 'titular', familiares: 0 },
];

const { cuotas, excluidos } = calcularCuotasDelPeriodo(socios, tarifario, {
  primerDiaDelPeriodo: enero,
});

const monto = (id: string) => cuotas.find((c) => c.socioId === id)?.monto ?? null;
const motivo = (id: string) => excluidos.find((e) => e.socioId === id)?.motivo ?? null;

console.log('\nQuién paga y cuánto');
comprobar('activo suelto            ', monto('activo-suelto'), 12000);
comprobar('activo moroso igual paga ', monto('activo-moroso'), 12000);
comprobar('cadete suelto            ', monto('cadete'), 6000);

console.log('\nQuién no paga, y por qué');
comprobar('vitalicio: sin precio    ', motivo('vitalicio'), 'sin_precio');
comprobar('honorario: sin precio    ', motivo('honorario'), 'sin_precio');
comprobar('en licencia: eximido     ', motivo('en-licencia'), 'eximido');
comprobar('cesante: eximido         ', motivo('cesante'), 'eximido');
comprobar('expulsado: eximido       ', motivo('expulsado'), 'eximido');

console.log('\nGrupo familiar: paga el titular una sola vez');
comprobar('titular paga la familiar ', monto('titular'), 20000);
comprobar('esposa no paga aparte    ', motivo('esposa'), 'lo_paga_el_titular');
comprobar('hijo tampoco             ', motivo('hijo'), 'lo_paga_el_titular');
comprobar('el concepto lo aclara    ', cuotas.find((c) => c.socioId === 'titular')?.concepto, 'Cuota social · Grupo familiar');

console.log('\nTotales');
comprobar('cuotas generadas         ', cuotas.length, 4);
comprobar('recaudación esperada     ', cuotas.reduce((s, c) => s + c.monto, 0), 50000);

console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} comprobaciones fallaron.\n`);
process.exit(fallas === 0 ? 0 : 1);
