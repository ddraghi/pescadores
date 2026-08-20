/**
 * Prueba un interruptor Sonoff por la red local.
 *
 *   npm run ewelink:probar -- --ip 192.168.1.50 --id 10009a1b2c --clave abcd-1234-...
 *
 * Es la prueba que decide si un modelo sirve para el club: si contesta acá, se puede
 * operar con Starlink caído. Si no contesta, ese modelo no entra, por lindo que sea.
 *
 * La clave del aparato sale de la nube de eWeLink o del Wi-Fi de configuración del
 * propio aparato. No hace falta la cuenta de desarrollador para esta prueba.
 */

import { accionar, consultar, estadoDeLaRespuesta, ESPERA_MS } from '../src/lib/ewelink/lan';

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function esperar(ms: number) {
  return new Promise((listo) => setTimeout(listo, ms));
}

async function main() {
  const ip = argumento('ip');
  const deviceId = argumento('id');
  const clave = argumento('clave');

  if (!ip || !deviceId || !clave) {
    console.error(`
Faltan datos. Se usa así:

  npm run ewelink:probar -- --ip 192.168.1.50 --id 10009a1b2c --clave abcd-1234-...

  --ip     La IP del interruptor en la red del predio. Sale del listado de clientes
           del router. Aprovechá y dejale la reserva de DHCP hecha.
  --id     El ID del aparato. Está en la app de eWeLink, en la información del
           dispositivo, y también impreso en la etiqueta.
  --clave  La clave del aparato (device key). Sale de la nube de eWeLink o del Wi-Fi
           de configuración del propio aparato.
`);
    process.exit(1);
  }

  const aparato = { ip, deviceId, clave };
  let fallas = 0;

  function paso(que: string, r: { ok: boolean; error?: string }) {
    console.log(r.ok ? `  ok   ${que}` : ` MAL  ${que} → ${r.error}`);
    if (!r.ok) fallas += 1;
    return r.ok;
  }

  console.log(`\nProbando ${deviceId} en ${ip}:8081 (espera de ${ESPERA_MS} ms por pedido)\n`);

  // 1. Preguntar cómo está. Si esto anda, el aparato habla el protocolo local y la
  //    clave es la correcta: es el 90% de lo que queremos saber.
  const antes = await consultar(aparato);
  if (!paso('Contesta y la clave sirve', antes)) {
    console.log(`
No contestó. Antes de descartar el modelo, revisá:

  · Que la PC y el interruptor estén en la misma red (no en la de invitados).
  · Que la IP sea la correcta y esté encendido.
  · Que la clave sea la de ESE aparato.
  · Que el firmware esté actualizado desde la app de eWeLink.

Si todo eso está bien y sigue sin contestar, este modelo no sirve para el club: no
se puede operar sin internet y tampoco se le puede cambiar el firmware.
`);
    process.exit(1);
  }

  const estadoInicial = estadoDeLaRespuesta(antes.datos);
  console.log(`       estado actual: ${estadoInicial ?? 'no lo informó'}`);

  // 2. Encender, leer, apagar, leer. Las órdenes son absolutas: se pide el estado que
  //    se quiere, nunca «invertí».
  paso('Acepta la orden de encender', await accionar(aparato, 'on'));
  await esperar(700);
  const encendido = await consultar(aparato);
  paso('Informa encendido', {
    ok: estadoDeLaRespuesta(encendido.datos) === 'on',
    error: `informó ${estadoDeLaRespuesta(encendido.datos) ?? 'nada'}`,
  });

  paso('Acepta la orden de apagar', await accionar(aparato, 'off'));
  await esperar(700);
  const apagado = await consultar(aparato);
  paso('Informa apagado', {
    ok: estadoDeLaRespuesta(apagado.datos) === 'off',
    error: `informó ${estadoDeLaRespuesta(apagado.datos) ?? 'nada'}`,
  });

  // 3. Dejarlo como estaba, para no dejar una bomba andando por una prueba.
  if (estadoInicial) await accionar(aparato, estadoInicial);

  if (fallas === 0) {
    console.log(`
Todo bien. Este modelo sirve: responde por red local, sin internet de por medio.

Lo que sigue:
  · Dejale la reserva de DHCP en el router, así la IP no cambia.
  · Probá lo mismo con el enlace a internet desconectado: es la prueba de verdad.
`);
  } else {
    console.log(`
${fallas} comprobaciones fallaron. Contesta, pero no del todo. Anotá exactamente qué
falló: puede ser una particularidad del modelo y no un problema del protocolo.
`);
  }

  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
