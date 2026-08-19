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
        titulo="Personal"
        descripcion="Jefes de predio, porteros, puntos de control, maestranza, profesores, concesionarios y médicos. El estatuto pone al personal a cargo de la Secretaría (art. 43 inc. d)."
      />
      <Designaciones
        {...datos}
        vacio="Todavía no designaste a nadie. El botón de arriba crea la persona y le asigna el rol en un solo paso."
      />
    </>
  );
}
