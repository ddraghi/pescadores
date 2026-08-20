/**
 * Prueba del cifrado del protocolo local de Sonoff.
 *
 *   npm run probar:lan
 *
 * No necesita ni aparatos ni red: comprueba que lo que ciframos se puede descifrar y
 * que el cuerpo del pedido tiene la forma que el interruptor espera. Es para que el día
 * que haya un Sonoff sobre la mesa, si algo falla, no sea por un error nuestro acá.
 */

import { createHash } from 'node:crypto';
import { cifrar, descifrar, cuerpoDelPedido } from '../src/lib/ewelink/lan';

let fallas = 0;

function comprobar(que: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas += 1;
  const detalle = ok ? '' : `  (esperaba ${JSON.stringify(esperado)})`;
  console.log(`${ok ? '  ok ' : ' MAL '} ${que} → ${JSON.stringify(real)}${detalle}`);
}

const CLAVE = '4d1e7e5a-3f2b-4c8d-9a10-2b3c4d5e6f70';

console.log('\nLa clave de cifrado son los 16 bytes crudos del MD5');
const derivada = createHash('md5').update(CLAVE, 'utf8').digest();
comprobar('mide 16 bytes ', derivada.length, 16);

console.log('\nIda y vuelta: lo que ciframos se descifra');
const { data, iv } = cifrar({ switch: 'on' }, CLAVE);
comprobar('vuelve igual  ', descifrar(data, iv, CLAVE), { switch: 'on' });

const vacio = cifrar({}, CLAVE);
comprobar('cuerpo vacío  ', descifrar(vacio.data, vacio.iv, CLAVE), {});

console.log('\nCon la clave equivocada no se lee nada');
comprobar('otra clave    ', descifrar(data, iv, 'clave-que-no-es'), null);
comprobar('dato basura   ', descifrar('no-es-base64-valido', iv, CLAVE), null);

console.log('\nCada pedido lleva su propio vector');
const uno = cifrar({ switch: 'on' }, CLAVE);
const otro = cifrar({ switch: 'on' }, CLAVE);
comprobar('vectores distintos', uno.iv !== otro.iv, true);

console.log('\nEl cuerpo del pedido tiene los campos que el aparato exige');
const cuerpo = cuerpoDelPedido('10009a1b2c', CLAVE, { switch: 'off' }, { secuencia: '123' });
comprobar('campos        ', Object.keys(cuerpo).sort(), [
  'data', 'deviceid', 'encrypt', 'iv', 'selfApikey', 'sequence',
]);
comprobar('deviceid      ', cuerpo.deviceid, '10009a1b2c');
comprobar('encrypt       ', cuerpo.encrypt, true);
comprobar('secuencia     ', cuerpo.sequence, '123');
comprobar(
  'la carga viaja cifrada',
  descifrar(cuerpo.data as string, cuerpo.iv as string, CLAVE),
  { switch: 'off' },
);

console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} comprobaciones fallaron.\n`);
process.exit(fallas === 0 ? 0 : 1);
