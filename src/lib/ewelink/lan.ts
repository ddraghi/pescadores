/**
 * Protocolo local de los interruptores Sonoff con firmware original.
 *
 * Es el camino que usa el nodo del predio para abrir una puerta o encender una bomba
 * **sin pasar por internet**: el pedido va del nodo al interruptor por la red del
 * predio, aunque Starlink esté caído.
 *
 * El aparato escucha en el puerto 8081 y espera el cuerpo cifrado con su propia clave.
 * La clave se saca una vez —de la nube de eWeLink, o del Wi-Fi de configuración del
 * aparato— y de ahí en adelante no hace falta internet nunca más.
 *
 * Sin dependencias y sin base de datos, a propósito: esto lo va a reusar tal cual el
 * nodo del predio cuando se escriba.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** El puerto en el que escuchan los Sonoff en modo local. */
export const PUERTO_LAN = 8081;

/**
 * Cuánto se espera una respuesta antes de darla por perdida.
 *
 * Corto a propósito: es la red local, no internet. Si el aparato no contesta en dos
 * segundos, no está. Hacer esperar al portero no lo va a hacer aparecer.
 */
export const ESPERA_MS = 2000;

export type OrdenLan = 'on' | 'off';

export interface RespuestaLan {
  ok: boolean;
  error?: string;
  /** Lo que devolvió el aparato, ya descifrado, cuando devuelve algo. */
  datos?: Record<string, unknown>;
}

/**
 * La clave de cifrado sale del MD5 de la clave del aparato.
 *
 * No es una decisión nuestra: es como lo hizo ITEAD y hay que seguirlo tal cual. Son
 * los 16 bytes crudos del hash, no su representación en hexadecimal.
 */
function claveDeCifrado(claveDispositivo: string): Buffer {
  return createHash('md5').update(claveDispositivo, 'utf8').digest();
}

/** Cifra el cuerpo del pedido. Devuelve el dato y el vector, los dos en base64. */
export function cifrar(
  carga: Record<string, unknown>,
  claveDispositivo: string,
  vector?: Buffer,
): { data: string; iv: string } {
  const iv = vector ?? randomBytes(16);
  const cifrador = createCipheriv('aes-128-cbc', claveDeCifrado(claveDispositivo), iv);
  const data = Buffer.concat([
    cifrador.update(JSON.stringify(carga), 'utf8'),
    cifrador.final(),
  ]).toString('base64');
  return { data, iv: iv.toString('base64') };
}

/** Descifra lo que contestó el aparato. Devuelve null si la clave no es la correcta. */
export function descifrar(
  data: string,
  iv: string,
  claveDispositivo: string,
): Record<string, unknown> | null {
  try {
    const descifrador = createDecipheriv(
      'aes-128-cbc',
      claveDeCifrado(claveDispositivo),
      Buffer.from(iv, 'base64'),
    );
    const texto = Buffer.concat([
      descifrador.update(Buffer.from(data, 'base64')),
      descifrador.final(),
    ]).toString('utf8');
    return JSON.parse(texto);
  } catch {
    // Clave equivocada, o el aparato contestó algo que no esperábamos. Las dos cosas
    // significan lo mismo para quien llama: no se pudo leer.
    return null;
  }
}

/** Arma el cuerpo del pedido tal como lo espera el aparato. */
export function cuerpoDelPedido(
  deviceId: string,
  claveDispositivo: string,
  carga: Record<string, unknown>,
  opciones: { secuencia?: string; vector?: Buffer } = {},
): Record<string, unknown> {
  const { data, iv } = cifrar(carga, claveDispositivo, opciones.vector);
  return {
    sequence: opciones.secuencia ?? String(Date.now()),
    deviceid: deviceId,
    // El aparato exige el campo pero no lo valida cuando la orden viene cifrada.
    selfApikey: '123',
    encrypt: true,
    data,
    iv,
  };
}

export interface Aparato {
  deviceId: string;
  clave: string;
  ip: string;
}

async function pedir(
  aparato: Aparato,
  ruta: string,
  carga: Record<string, unknown>,
): Promise<RespuestaLan> {
  const cuerpo = cuerpoDelPedido(aparato.deviceId, aparato.clave, carga);
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);

  try {
    const respuesta = await fetch(`http://${aparato.ip}:${PUERTO_LAN}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
    });

    if (!respuesta.ok) {
      return { ok: false, error: `El aparato contestó HTTP ${respuesta.status}.` };
    }

    const cuerpoRespuesta = (await respuesta.json()) as {
      error?: number;
      data?: string;
      iv?: string;
    };

    // El aparato usa `error: 0` para decir que salió bien. Cualquier otro número es un
    // rechazo suyo, no un problema de red.
    if (cuerpoRespuesta.error && cuerpoRespuesta.error !== 0) {
      return { ok: false, error: `El aparato rechazó la orden (error ${cuerpoRespuesta.error}).` };
    }

    const datos =
      cuerpoRespuesta.data && cuerpoRespuesta.iv
        ? descifrar(cuerpoRespuesta.data, cuerpoRespuesta.iv, aparato.clave)
        : undefined;

    if (cuerpoRespuesta.data && !datos) {
      return { ok: false, error: 'No se pudo descifrar la respuesta: la clave no coincide.' };
    }

    return { ok: true, datos: datos ?? undefined };
  } catch (e) {
    const causa = e instanceof Error && e.name === 'AbortError'
      ? `No contestó en ${ESPERA_MS} ms.`
      : e instanceof Error
        ? e.message
        : 'Falló la conexión.';
    return { ok: false, error: `No se pudo hablar con ${aparato.ip}: ${causa}` };
  }
}

/**
 * Enciende o apaga.
 *
 * La orden es **absoluta**, nunca «invertir»: si se duplica sobre un enlace inestable,
 * no pasa nada. Es la misma regla que sigue toda la plataforma.
 */
export function accionar(aparato: Aparato, orden: OrdenLan): Promise<RespuestaLan> {
  return pedir(aparato, '/zeroconf/switch', { switch: orden });
}

/** Pregunta cómo está. Es lo que hace que el testigo deje de decir «sin dato». */
export function consultar(aparato: Aparato): Promise<RespuestaLan> {
  return pedir(aparato, '/zeroconf/info', {});
}

/** Lee el estado del interruptor de una respuesta de `consultar()`. */
export function estadoDeLaRespuesta(datos: Record<string, unknown> | undefined): OrdenLan | null {
  if (!datos) return null;
  const estado = datos.switch;
  return estado === 'on' || estado === 'off' ? estado : null;
}
