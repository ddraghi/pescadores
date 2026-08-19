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
        titulo="Cobradores"
        descripcion="Quienes cobran a domicilio. Dependen de Tesorería: acá se los da de alta, y en la etapa 4 se les arma la cartera y se les cierra la rendición."
      />
      <Designaciones {...datos} vacio="Todavía no hay cobradores dados de alta." />
    </>
  );
}
