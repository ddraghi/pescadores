import { exigirCapacidad } from '@/lib/auth';
import { PanelInicial } from '@/components/panel/panel-inicial';

// La capacidad se vuelve a exigir acá aunque el middleware ya haya filtrado por ruta:
// el perímetro no alcanza como control de acceso.
export default async function Pagina() {
  const sesion = await exigirCapacidad('administrar_predio');
  return <PanelInicial rol={sesion.rolActivo} />;
}
