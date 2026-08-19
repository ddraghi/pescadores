/**
 * Prueba del lector de CSV del padrón.
 *
 *   npm run probar:csv
 *
 * No necesita base de datos. Cuando aparezca el archivo real del sistema actual del
 * club, los casos que fallen se agregan acá primero y después se arregla el lector.
 */

import { mapearEncabezados, aFecha, aCategoria, aEstado } from '../src/lib/csv-padron';

let fallas = 0;

function comprobar(que: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas += 1;
  const detalle = ok ? '' : `  (esperaba ${JSON.stringify(esperado)})`;
  console.log(`${ok ? '  ok ' : ' MAL '} ${que} → ${JSON.stringify(real)}${detalle}`);
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

console.log('\nEncabezados, escritos como los escribiría una planilla de verdad');
const mapa = mapearEncabezados([
  'N° de Socio', 'Apellido y Nombre', 'D.N.I.', 'Categoría',
  'Situación', 'Fecha de Ingreso', 'Correo Electrónico', 'Celular',
]);
comprobar('número de socio', mapa.numeroSocio, 'N° de Socio');
comprobar('nombre         ', mapa.nombre, 'Apellido y Nombre');
comprobar('dni            ', mapa.dni, 'D.N.I.');
comprobar('categoría      ', mapa.categoria, 'Categoría');
comprobar('estado         ', mapa.estado, 'Situación');
comprobar('fecha ingreso  ', mapa.fechaIngreso, 'Fecha de Ingreso');
comprobar('correo         ', mapa.email, 'Correo Electrónico');
comprobar('teléfono       ', mapa.telefono, 'Celular');

console.log('\nFechas');
comprobar('31/12/2024        ', iso(aFecha('31/12/2024')), '2024-12-31');
comprobar('03/04/2024 = 3 abr', iso(aFecha('03/04/2024')), '2024-04-03');
comprobar('2024-12-31 en ISO ', iso(aFecha('2024-12-31')), '2024-12-31');
comprobar('5-7-1998          ', iso(aFecha('5-7-1998')), '1998-07-05');
comprobar('31/02 no existe   ', aFecha('31/02/2024'), null);
comprobar('vacía             ', aFecha(''), null);
comprobar('texto cualquiera  ', aFecha('sin datos'), null);

console.log('\nCategorías del estatuto');
comprobar('Activo          ', aCategoria('Activo'), 'ACTIVO');
comprobar('VITALICIO       ', aCategoria('VITALICIO'), 'VITALICIO');
comprobar('Transeunte      ', aCategoria('Transeunte'), 'TRANSEUNTE');
comprobar('Transeúnte      ', aCategoria('Transeúnte'), 'TRANSEUNTE');
comprobar('cadete          ', aCategoria('cadete'), 'CADETE');
comprobar('vacío → activo  ', aCategoria(''), 'ACTIVO');
comprobar('desconocida     ', aCategoria('socio raro'), null);

console.log('\nEstados');
comprobar('Al día     ', aEstado('Al día'), 'AL_DIA');
comprobar('Moroso     ', aEstado('Moroso'), 'MOROSO');
comprobar('DE BAJA    ', aEstado('DE BAJA'), 'CESANTE');
comprobar('En licencia', aEstado('En licencia'), 'LICENCIA');
comprobar('vacío      ', aEstado(''), 'AL_DIA');

console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} comprobaciones fallaron.\n`);
process.exit(fallas === 0 ? 0 : 1);
