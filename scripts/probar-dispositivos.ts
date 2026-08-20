/**
 * Prueba del estado visible de los dispositivos y de las vías permitidas.
 *
 *   npm run probar:dispositivos
 *
 * Es la lógica más delicada de la etapa: un testigo que muestra un estado viejo lleva a
 * que alguien apriete creyendo que enciende una bomba y en realidad la apague.
 */

import {
  conexionVisible,
  estadoVisible,
  muestraConexion,
  nombrarDias,
  viaPermitida,
  FRESCURA_SEGUNDOS,
} from '../src/lib/dispositivos';

let fallas = 0;

function comprobar(que: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas += 1;
  const detalle = ok ? '' : `  (esperaba ${JSON.stringify(esperado)})`;
  console.log(`${ok ? '  ok ' : ' MAL '} ${que} → ${JSON.stringify(real)}${detalle}`);
}

const AHORA = new Date('2026-08-19T12:00:00');
const haceSegundos = (s: number) => new Date(AHORA.getTime() - s * 1000);

console.log('\nLectura fresca: se muestra tal cual');
comprobar('encendido hace 5 s ', estadoVisible('ENCENDIDO', haceSegundos(5), { ahora: AHORA }), 'ENCENDIDO');
comprobar('apagado hace 30 s  ', estadoVisible('APAGADO', haceSegundos(30), { ahora: AHORA }), 'APAGADO');
comprobar('justo en el límite ', estadoVisible('ENCENDIDO', haceSegundos(FRESCURA_SEGUNDOS), { ahora: AHORA }), 'ENCENDIDO');

console.log('\nLectura vieja: SIN_DATO, aunque sepamos qué decía');
comprobar('un segundo tarde   ', estadoVisible('ENCENDIDO', haceSegundos(FRESCURA_SEGUNDOS + 1), { ahora: AHORA }), 'SIN_DATO');
comprobar('hace veinte minutos', estadoVisible('APAGADO', haceSegundos(1200), { ahora: AHORA }), 'SIN_DATO');
comprobar('nunca se leyó      ', estadoVisible('APAGADO', null, { ahora: AHORA }), 'SIN_DATO');
comprobar('estado desconocido ', estadoVisible('SIN_DATO', haceSegundos(1), { ahora: AHORA }), 'SIN_DATO');

console.log('\nModo simulado: la lectura no envejece');
comprobar('viejo pero simulado', estadoVisible('ENCENDIDO', haceSegundos(9999), { ahora: AHORA, simulado: true }), 'ENCENDIDO');
comprobar('sin lectura previa ', estadoVisible('APAGADO', null, { ahora: AHORA, simulado: true }), 'APAGADO');

console.log('\nVías: en un predio satelital la orden no puede salir por la nube');
comprobar('relay USB, satelital ', viaPermitida('relay_usb', true), true);
comprobar('Sonoff LAN, satelital', viaPermitida('sonoff_lan', true), true);
comprobar('Sonoff nube, satelital', viaPermitida('sonoff_cloud', true), false);
comprobar('Sonoff nube, terrestre', viaPermitida('sonoff_cloud', false), true);

console.log('\nDías de la semana en palabras');
comprobar('vacío        ', nombrarDias([]), 'todos los días');
comprobar('los siete    ', nombrarDias([1, 2, 3, 4, 5, 6, 7]), 'todos los días');
comprobar('uno solo     ', nombrarDias([3]), 'Mi');
comprobar('tres días    ', nombrarDias([1, 3, 5]), 'Lu, Mi y Vi');
comprobar('fin de semana', nombrarDias([6, 7]), 'Sá y Do');

console.log('\nLos de acceso informan conexión, no encendido/apagado');
comprobar('acceso        ', muestraConexion('ACCESO'), true);
comprobar('bomba         ', muestraConexion('BOMBA'), false);
comprobar('iluminación   ', muestraConexion('ILUMINACION'), false);
comprobar('riego         ', muestraConexion('RIEGO'), false);

console.log('\nConexión: o reportó hace poco, o no reportó');
comprobar('reportó hace 5 s   ', conexionVisible(haceSegundos(5), { ahora: AHORA }), 'EN_LINEA');
comprobar('justo en el límite ', conexionVisible(haceSegundos(FRESCURA_SEGUNDOS), { ahora: AHORA }), 'EN_LINEA');
comprobar('un segundo tarde   ', conexionVisible(haceSegundos(FRESCURA_SEGUNDOS + 1), { ahora: AHORA }), 'SIN_CONEXION');
comprobar('nunca reportó      ', conexionVisible(null, { ahora: AHORA }), 'SIN_CONEXION');
comprobar('simulado, sin datos', conexionVisible(null, { ahora: AHORA, simulado: true }), 'EN_LINEA');

console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} comprobaciones fallaron.\n`);
process.exit(fallas === 0 ? 0 : 1);
