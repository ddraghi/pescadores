'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo } from '@/components/ui/campos';
import { DialogoFormulario } from '@/components/panel/dialogo-formulario';
import { cambiarCategoria } from '@/lib/acciones/socios';
import { CATEGORIAS, type NombreCategoria } from '@/lib/socios';

/** Pasa a un socio a la categoría que el estatuto indica, dejando constancia. */
export function PasarACategoria({
  socioId,
  nombre,
  categoria,
  motivoSugerido,
}: {
  socioId: string;
  nombre: string;
  categoria: NombreCategoria;
  motivoSugerido: string;
}) {
  return (
    <DialogoFormulario
      titulo={`Pasar a ${nombre} a ${CATEGORIAS[categoria]}`}
      descripcion={motivoSugerido}
      accion={cambiarCategoria}
      textoGuardar="Registrar"
      disparador={
        <Button variant="outline" size="sm">
          Pasar a {CATEGORIAS[categoria]}
        </Button>
      }
    >
      <input type="hidden" name="socioId" value={socioId} />
      <input type="hidden" name="categoria" value={categoria} />
      <Campo etiqueta="Motivo" htmlFor={`m-${socioId}`}>
        <Input id={`m-${socioId}`} name="motivo" defaultValue={motivoSugerido} />
      </Campo>
    </DialogoFormulario>
  );
}
