import { NextResponse } from "next/server";
import { sesionActual } from "@/lib/auth";
import { leerImagenCroquis } from "@/lib/archivos";

/**
 * Sirve los croquis subidos. Van por acá y no desde public porque los archivos que
 * sube el club no pueden vivir en el árbol del build.
 *
 * Exige sesión: un croquis muestra la instalación eléctrica de un predio y no tiene
 * por qué ser público.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ archivo: string }> },
) {
  const sesion = await sesionActual();
  if (!sesion) return new NextResponse("No autorizado", { status: 401 });

  const { archivo } = await params;
  const imagen = await leerImagenCroquis(archivo);
  if (!imagen) return new NextResponse("No encontrado", { status: 404 });

  return new NextResponse(new Uint8Array(imagen.contenido), {
    headers: {
      "Content-Type": imagen.tipo,
      // El nombre del archivo es único e inmutable, así que se puede cachear fuerte.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
