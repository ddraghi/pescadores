'use server';

/**
 * Importación del padrón desde un CSV.
 *
 * Está escrito para ser tolerante con el archivo que salga del sistema actual, que
 * todavía no conocemos: acepta variantes de los nombres de columna, fechas en los dos
 * formatos que se usan acá, y categorías escritas con o sin tilde.
 *
 * Nunca importa a medias en silencio: devuelve fila por fila qué entró y qué no, con el
 * motivo. Un padrón a medias sin que nadie se entere es peor que uno que no entró.
 */

import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { CategoriaSocio, EstadoSocio } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { exigirCapacidadApi } from '@/lib/auth';
import { traducirError } from '@/lib/acciones/comun';
import { aCategoria, aEstado, aFecha, mapearEncabezados } from '@/lib/csv-padron';

export interface ReporteImportacion {
  leidas: number;
  creados: number;
  actualizados: number;
  rechazos: { fila: number; dato: string; motivo: string }[];
}

type Resp =
  | { ok: true; reporte: ReporteImportacion }
  | { ok: false; error: string };

export async function importarPadron(_prev: Resp | null, datos: FormData): Promise<Resp> {
  try {
    await exigirCapacidadApi('administrar_socios');

    const archivo = datos.get('archivo');
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { ok: false, error: 'Elegí un archivo CSV.' };
    }
    if (archivo.size > 10 * 1024 * 1024) {
      return { ok: false, error: 'El archivo supera los 10 MB. Partilo en tandas.' };
    }

    const texto = await archivo.text();
    const parseado = Papa.parse<Record<string, string>>(texto, {
      header: true,
      skipEmptyLines: true,
      delimiter: '', // que lo deduzca solo: hay exportaciones con punto y coma
    });

    const campos = parseado.meta.fields ?? [];
    const mapa = mapearEncabezados(campos);

    if (!mapa.nombre || !mapa.dni) {
      return {
        ok: false,
        error: `El archivo necesita al menos una columna de nombre y una de DNI. Encontré: ${campos.join(', ') || 'ninguna'}.`,
      };
    }

    const reporte: ReporteImportacion = { leidas: 0, creados: 0, actualizados: 0, rechazos: [] };
    const dnisVistos = new Set<string>();

    // El número de socio se necesita único. Si el archivo no lo trae, se numera a
    // continuación del más alto que ya exista.
    const mayor = await prisma.socio.aggregate({ _max: { numeroSocio: true } });
    let proximoNumero = (mayor._max.numeroSocio ?? 0) + 1;

    for (const [i, fila] of parseado.data.entries()) {
      const numeroFila = i + 2; // +1 por el encabezado, +1 porque las planillas cuentan desde 1
      reporte.leidas += 1;

      const nombre = (fila[mapa.nombre] ?? '').trim();
      const dni = (fila[mapa.dni] ?? '').replace(/\D/g, '');

      if (!nombre) {
        reporte.rechazos.push({ fila: numeroFila, dato: dni || '—', motivo: 'Sin nombre.' });
        continue;
      }
      if (!/^\d{7,9}$/.test(dni)) {
        reporte.rechazos.push({ fila: numeroFila, dato: nombre, motivo: `DNI inválido: "${fila[mapa.dni] ?? ''}".` });
        continue;
      }
      if (dnisVistos.has(dni)) {
        reporte.rechazos.push({ fila: numeroFila, dato: nombre, motivo: `El DNI ${dni} está repetido en el archivo.` });
        continue;
      }
      dnisVistos.add(dni);

      const categoria = mapa.categoria ? aCategoria(fila[mapa.categoria] ?? '') : CategoriaSocio.ACTIVO;
      if (!categoria) {
        reporte.rechazos.push({ fila: numeroFila, dato: nombre, motivo: `Categoría desconocida: "${fila[mapa.categoria]}".` });
        continue;
      }

      const estado = mapa.estado ? aEstado(fila[mapa.estado] ?? '') : EstadoSocio.AL_DIA;
      if (!estado) {
        reporte.rechazos.push({ fila: numeroFila, dato: nombre, motivo: `Estado desconocido: "${fila[mapa.estado]}".` });
        continue;
      }

      const ingreso = mapa.fechaIngreso ? aFecha(fila[mapa.fechaIngreso] ?? '') : null;
      const nacimiento = mapa.fechaNacimiento ? aFecha(fila[mapa.fechaNacimiento] ?? '') : null;
      const nroCrudo = mapa.numeroSocio ? Number((fila[mapa.numeroSocio] ?? '').replace(/\D/g, '')) : NaN;

      try {
        const persona = await prisma.persona.upsert({
          where: { dni },
          update: {
            nombre,
            ...(mapa.email && fila[mapa.email] ? { email: fila[mapa.email].trim() } : {}),
            ...(mapa.telefono && fila[mapa.telefono] ? { telefono: fila[mapa.telefono].trim() } : {}),
            ...(nacimiento ? { fechaNacimiento: nacimiento } : {}),
          },
          create: {
            dni,
            nombre,
            email: mapa.email ? fila[mapa.email]?.trim() || null : null,
            telefono: mapa.telefono ? fila[mapa.telefono]?.trim() || null : null,
            fechaNacimiento: nacimiento,
          },
          include: { socio: { select: { id: true } } },
        });

        if (persona.socio) {
          await prisma.socio.update({
            where: { id: persona.socio.id },
            data: { categoria, estado, ...(ingreso ? { fechaIngreso: ingreso } : {}) },
          });
          reporte.actualizados += 1;
        } else {
          const numeroSocio = Number.isFinite(nroCrudo) && nroCrudo > 0 ? nroCrudo : proximoNumero++;
          await prisma.socio.create({
            data: {
              personaId: persona.id,
              numeroSocio,
              categoria,
              estado,
              fechaIngreso: ingreso ?? new Date(),
            },
          });
          reporte.creados += 1;
        }
      } catch (e) {
        const detalle =
          e && typeof e === 'object' && 'code' in e && e.code === 'P2002'
            ? 'El número de socio ya está usado por otra persona.'
            : 'No se pudo guardar.';
        reporte.rechazos.push({ fila: numeroFila, dato: nombre, motivo: detalle });
      }
    }

    revalidatePath('/secretaria', 'layout');
    return { ok: true, reporte };
  } catch (e) {
    const r = traducirError(e, 'importarPadron');
    return { ok: false, error: r.error };
  }
}
