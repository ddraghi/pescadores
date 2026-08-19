import { exigirCapacidad } from '@/lib/auth';
import { EncabezadoPantalla } from '@/components/panel/encabezado';
import { Designaciones } from '@/components/panel/designaciones';
import { datosDesignaciones } from '@/lib/datos/designaciones';

export default async function Pagina() {
  const sesion = await exigirCapacidad('designar_roles');
  const datos = await datosDesignaciones(sesion.rolActivo);

  return (
    <>
      <EncabezadoPantalla
        titulo="Designaciones"
        descripcion="El Administrador General designa al Secretario y al Tesorero. De ahí en adelante, el Secretario designa al personal y el Tesorero a sus cobradores."
      />
      <Designaciones
        {...datos}
        vacio="Todavía no hay Secretario ni Tesorero designados."
      />
    </>
  );
}
