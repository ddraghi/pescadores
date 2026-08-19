/**
 * Prueba de la decisión de acceso.
 *
 *   npm run probar:acceso
 *
 * Cada caso corresponde a una regla del estatuto. Si alguna vez hay que discutir por qué
 * el sistema dejó pasar o frenó a alguien, se discute contra este archivo.
 */

import { resolverAcceso, type SituacionDeAcceso } from '../src/lib/acceso';

let fallas = 0;

function comprobar(que: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas += 1;
  const detalle = ok ? '' : `  (esperaba ${JSON.stringify(esperado)})`;
  console.log(`${ok ? '  ok ' : ' MAL '} ${que} → ${JSON.stringify(real)}${detalle}`);
}

const HOY = new Date('2026-08-19T10:00:00');
const ayer = new Date('2026-08-18T00:00:00');
const enUnMes = new Date('2026-09-19T00:00:00');

const base = (extra: Partial<SituacionDeAcceso> = {}): SituacionDeAcceso => ({
  tipoAcceso: 'PORTERIA',
  fecha: HOY,
  esSocio: true,
  estadoSocio: 'AL_DIA',
  categoria: 'ACTIVO',
  ...extra,
});

const v = (extra: Partial<SituacionDeAcceso> = {}) => resolverAcceso(base(extra)).veredicto;
const cobra = (extra: Partial<SituacionDeAcceso> = {}) => resolverAcceso(base(extra)).cobrarComo;
const motivo = (extra: Partial<SituacionDeAcceso> = {}) => resolverAcceso(base(extra)).motivo;

console.log('\nPortería · el socio común');
comprobar('al día                  ', v(), 'PASA');
comprobar('al día no paga nada     ', cobra(), null);

console.log('\nPortería · estados que cierran la puerta');
comprobar('cesante                 ', v({ estadoSocio: 'CESANTE' }), 'NO_PASA');
comprobar('expulsado               ', v({ estadoSocio: 'EXPULSADO' }), 'NO_PASA');
comprobar('suspendido              ', v({ estadoSocio: 'SUSPENDIDO' }), 'NO_PASA');

console.log('\nPortería · los que pasan con aviso (art. 28)');
comprobar('moroso pasa             ', v({ estadoSocio: 'MOROSO' }), 'AVISO');
comprobar('emplazado TAMBIÉN pasa  ', v({ estadoSocio: 'EMPLAZADO' }), 'AVISO');
comprobar('y no se le cobra nada   ', cobra({ estadoSocio: 'EMPLAZADO' }), null);

console.log('\nPortería · licencia: entra pero paga como no socio (art. 25)');
comprobar('veredicto               ', v({ estadoSocio: 'LICENCIA' }), 'AVISO');
comprobar('se le cobra como no socio', cobra({ estadoSocio: 'LICENCIA' }), 'NO_SOCIO');

console.log('\nPortería · transeúnte (art. 14 inc. e)');
comprobar('permiso vigente         ', v({ categoria: 'TRANSEUNTE', permisoHasta: enUnMes }), 'PASA');
comprobar('permiso vencido paga    ', cobra({ categoria: 'TRANSEUNTE', permisoHasta: ayer }), 'NO_SOCIO');
comprobar('sin fecha de permiso    ', v({ categoria: 'TRANSEUNTE', permisoHasta: null }), 'AVISO');

console.log('\nPortería · quien no es socio');
comprobar('paga como no socio      ', cobra({ esSocio: false }), 'NO_SOCIO');
comprobar('jubilado, tarifa propia ', cobra({ esSocio: false, condicionDeclarada: 'JUBILADO' }), 'JUBILADO');
comprobar('menor de 5 sin cargo    ', v({ esSocio: false, condicionDeclarada: 'MENOR_5' }), 'PASA');
comprobar('y no se le cobra        ', cobra({ esSocio: false, condicionDeclarada: 'MENOR_5' }), null);

console.log('\nPortería · barrio de fin de semana (arts. 9 y 10 del reglamento)');
comprobar('con permiso de estadía  ', v({ esSocio: false, autorizacionEstadiaVigente: true }), 'PASA');
comprobar('sin permiso, paga       ', cobra({ esSocio: false, autorizacionEstadiaVigente: false }), 'NO_SOCIO');

console.log('\nControl de pileta · exige apto médico');
const pileta = { tipoAcceso: 'CONTROL' as const, exigeAptoMedico: true };
comprobar('apto vigente            ', v({ ...pileta, aptoMedicoHasta: enUnMes }), 'PASA');
comprobar('apto vencido            ', v({ ...pileta, aptoMedicoHasta: ayer }), 'NO_PASA');
comprobar('sin apto                ', v({ ...pileta, aptoMedicoHasta: null }), 'NO_PASA');
comprobar('rechazado por el médico ', motivo({ ...pileta, aptoMedicoHasta: enUnMes, aptoMedicoAutorizado: false }), 'apto_rechazado');

console.log('\nControl de pileta · exige derecho de temporada');
const conDerecho = { ...pileta, aptoMedicoHasta: enUnMes, exigeDerecho: 'DERECHO_PILETA' };
comprobar('lo tiene                ', v({ ...conDerecho, derechosVigentes: ['DERECHO_PILETA'] }), 'PASA');
comprobar('no lo tiene             ', v({ ...conDerecho, derechosVigentes: [] }), 'NO_PASA');
comprobar('en portería sí se cobra ', cobra({ ...conDerecho, tipoAcceso: 'PORTERIA', derechosVigentes: [] }), 'SOCIO');

console.log('\nControl · el punto de control nunca cobra');
comprobar('no socio en control     ', v({ tipoAcceso: 'CONTROL', esSocio: false }), 'NO_PASA');
comprobar('y no se le cobra        ', cobra({ tipoAcceso: 'CONTROL', esSocio: false }), null);
comprobar('licencia en control     ', v({ tipoAcceso: 'CONTROL', estadoSocio: 'LICENCIA' }), 'NO_PASA');
comprobar('moroso sí pasa          ', v({ tipoAcceso: 'CONTROL', estadoSocio: 'MOROSO' }), 'AVISO');

console.log('\nPrecedencia: lo que cierra la puerta gana sobre lo que avisa');
comprobar('cesante con apto vigente', v({ ...pileta, estadoSocio: 'CESANTE', aptoMedicoHasta: enUnMes }), 'NO_PASA');
comprobar('moroso sin apto         ', motivo({ ...pileta, estadoSocio: 'MOROSO', aptoMedicoHasta: ayer }), 'apto_vencido');

console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} comprobaciones fallaron.\n`);
process.exit(fallas === 0 ? 0 : 1);
