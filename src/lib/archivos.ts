import 'server-only';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Archivos subidos por el club: por ahora los croquis de los predios.
 *
 * NO van a `public/`. Esa carpeta es parte del build: en un despliegue nuevo se
 * reemplaza entera y los archivos subidos desaparecerían. Van a un directorio de datos
 * aparte, que es lo que después hay que respaldar y montar como volumen.
 *
 * El día que haga falta almacenamiento externo (S3 o similar), se cambia sólo este
 * archivo: nada más sabe dónde están.
 */
const RAIZ_DATOS = process.env.DIRECTORIO_DATOS ?? path.join(process.cwd(), 'datos');
const CARPETA_CROQUIS = path.join(RAIZ_DATOS, 'croquis');

const EXTENSIONES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

/** Guarda la imagen y devuelve el nombre con el que quedó. */
export async function guardarImagenCroquis(archivo: File): Promise<string> {
  const extension = EXTENSIONES[archivo.type] ?? '.bin';
  const nombre = `${randomUUID()}${extension}`;

  await fs.mkdir(CARPETA_CROQUIS, { recursive: true });
  const contenido = Buffer.from(await archivo.arrayBuffer());
  await fs.writeFile(path.join(CARPETA_CROQUIS, nombre), contenido);

  return nombre;
}

/**
 * Lee un croquis guardado. Devuelve null si no existe.
 *
 * El nombre se valida contra un patrón estricto: sin eso, un nombre con `..` dejaría
 * leer cualquier archivo del servidor.
 */
export async function leerImagenCroquis(
  nombre: string,
): Promise<{ contenido: Buffer; tipo: string } | null> {
  if (!/^[a-f0-9-]{36}\.[a-z]{3,4}$/i.test(nombre)) return null;

  try {
    const contenido = await fs.readFile(path.join(CARPETA_CROQUIS, nombre));
    const extension = path.extname(nombre).toLowerCase();
    const tipo =
      Object.entries(EXTENSIONES).find(([, e]) => e === extension)?.[0] ?? 'application/octet-stream';
    return { contenido, tipo };
  } catch {
    return null;
  }
}
