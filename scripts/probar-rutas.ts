/**
 * Verifica que todo ítem de menú ya habilitado tenga su pantalla.
 *
 *   npm run probar:rutas
 *
 * Al subir ETAPA_ACTUAL se encienden de golpe varios ítems, y es fácil que alguno quede
 * apuntando a una ruta que todavía no existe. Eso no lo detecta el build —Next no sabe
 * qué enlaces pensamos usar— pero el usuario se lo encuentra como un 404.
 */

import fs from 'node:fs';
import path from 'node:path';
import { MENUS, ETAPA_ACTUAL, disponible } from '../src/lib/menus';
import { ROLES } from '../src/lib/roles';
import type { Rol } from '@prisma/client';

const RAIZ = path.join(process.cwd(), 'src', 'app', '(panel)');

/** ¿Existe un page.tsx para esta ruta? */
function existePantalla(href: string): boolean {
  const limpio = href.split('?')[0].replace(/^\//, '');
  return fs.existsSync(path.join(RAIZ, limpio, 'page.tsx'));
}

let faltantes = 0;
let habilitados = 0;

console.log(`\nEtapa construida: ${ETAPA_ACTUAL}\n`);

for (const [rol, items] of Object.entries(MENUS) as [Rol, typeof MENUS[Rol]][]) {
  const encendidos = items.filter(disponible);
  const rotos = encendidos.filter((i) => !existePantalla(i.href));
  habilitados += encendidos.length;

  if (rotos.length > 0) {
    faltantes += rotos.length;
    console.log(`${ROLES[rol].etiqueta}:`);
    for (const r of rotos) {
      console.log(`   FALTA  ${r.href}  ("${r.etiqueta}", etapa ${r.etapa})`);
    }
  }
}

if (faltantes === 0) {
  console.log(`Las ${habilitados} pantallas habilitadas existen.\n`);
  process.exit(0);
}

console.log(`\n${faltantes} ítems de menú apuntan a pantallas que no existen.`);
console.log('Construilas, o subiles el número de etapa hasta que les toque.\n');
process.exit(1);
