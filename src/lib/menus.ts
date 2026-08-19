/**
 * Menú lateral de cada rol.
 *
 * Cada ítem declara en qué ETAPA del plan se habilita. Los de etapas futuras se
 * muestran igual, apagados y con su número: así el menú refleja desde el principio la
 * forma final del panel, sin enlaces rotos. Cuando una etapa se construye, se baja el
 * número y el ítem se enciende solo.
 */

import {
  BarChart3, Bell, Building2, CalendarDays, ClipboardList, CreditCard, DoorOpen,
  FileText, Home, KeyRound, Landmark, ListChecks, LogIn, MapPin, Receipt, ScanLine,
  Settings, ShoppingBag, Stethoscope, Ticket, Users, Wallet, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Rol } from '@/lib/roles';

export interface ItemMenu {
  etiqueta: string;
  href: string;
  icono: LucideIcon;
  /** Etapa del plan en la que se habilita. 1 = disponible ahora. */
  etapa: number;
}

export const MENUS: Record<Rol, ItemMenu[]> = {
  ADMIN_GENERAL: [
    { etiqueta: 'Panel',            href: '/admin',              icono: Home,      etapa: 1 },
    { etiqueta: 'Designaciones',    href: '/admin/designaciones', icono: KeyRound,  etapa: 2 },
    { etiqueta: 'Configuración',    href: '/admin/configuracion', icono: Settings,  etapa: 6 },
    { etiqueta: 'Socios',           href: '/admin/socios',       icono: Users,     etapa: 3 },
    { etiqueta: 'Cobranzas',        href: '/admin/cobranzas',    icono: BarChart3, etapa: 4 },
    { etiqueta: 'Ocupación',        href: '/admin/ocupacion',    icono: Building2, etapa: 7 },
  ],

  SECRETARIO: [
    { etiqueta: 'Panel',            href: '/secretaria',             icono: Home,        etapa: 1 },
    { etiqueta: 'Predios',          href: '/secretaria/predios',     icono: MapPin,      etapa: 2 },
    { etiqueta: 'Instalaciones',    href: '/secretaria/instalaciones', icono: Building2, etapa: 2 },
    { etiqueta: 'Accesos',          href: '/secretaria/accesos',     icono: DoorOpen,    etapa: 2 },
    { etiqueta: 'Actividades',      href: '/secretaria/actividades', icono: ClipboardList, etapa: 2 },
    { etiqueta: 'Personal',         href: '/secretaria/personal',    icono: KeyRound,    etapa: 2 },
    { etiqueta: 'Socios',           href: '/secretaria/socios',      icono: Users,       etapa: 3 },
    { etiqueta: 'Actos estatutarios', href: '/secretaria/actos',     icono: FileText,    etapa: 3 },
  ],

  TESORERO: [
    { etiqueta: 'Panel',            href: '/tesoreria',            icono: Home,     etapa: 1 },
    { etiqueta: 'Tarifario',        href: '/tesoreria/tarifario',  icono: Ticket,   etapa: 4 },
    { etiqueta: 'Cuotas',           href: '/tesoreria/cuotas',     icono: Receipt,  etapa: 4 },
    { etiqueta: 'Morosos',          href: '/tesoreria/morosos',    icono: FileText, etapa: 4 },
    { etiqueta: 'Cobros',           href: '/tesoreria/cobros',     icono: Wallet,   etapa: 4 },
    { etiqueta: 'Cajas y arqueos',  href: '/tesoreria/cajas',      icono: Landmark, etapa: 4 },
    { etiqueta: 'Cobradores',       href: '/tesoreria/cobradores', icono: Users,    etapa: 2 },
    { etiqueta: 'Egresos',          href: '/tesoreria/egresos',    icono: BarChart3, etapa: 4 },
  ],

  COBRADOR: [
    { etiqueta: 'Mi cartera',       href: '/cobranza',            icono: Wallet,  etapa: 1 },
    { etiqueta: 'Mi rendición',     href: '/cobranza/rendicion',  icono: Receipt, etapa: 4 },
  ],

  JEFE_PREDIO: [
    { etiqueta: 'Panel del predio', href: '/predio',              icono: Home,        etapa: 1 },
    { etiqueta: 'Disponibilidad',   href: '/predio/disponibilidad', icono: CalendarDays, etapa: 7 },
    { etiqueta: 'Reservas',         href: '/predio/reservas',     icono: ClipboardList, etapa: 7 },
    { etiqueta: 'Ingresos',         href: '/predio/ingresos',     icono: LogIn,       etapa: 5 },
    { etiqueta: 'Personal',         href: '/predio/personal',     icono: Users,       etapa: 8 },
    { etiqueta: 'Dispositivos',     href: '/predio/dispositivos', icono: Settings,    etapa: 6 },
    { etiqueta: 'Croquis',          href: '/predio/croquis',      icono: MapPin,      etapa: 6 },
  ],

  PORTERO: [
    { etiqueta: 'Panel',            href: '/porteria',             icono: Home,         etapa: 1 },
    { etiqueta: 'Ingreso',          href: '/porteria/ingreso',     icono: DoorOpen,     etapa: 5 },
    { etiqueta: 'Cobrar',           href: '/porteria/cobrar',      icono: Wallet,       etapa: 5 },
    { etiqueta: 'Alojamiento',      href: '/porteria/alojamiento', icono: Building2,    etapa: 7 },
    { etiqueta: 'Mi caja',          href: '/porteria/caja',        icono: Landmark,     etapa: 4 },
    { etiqueta: 'Movimientos',      href: '/porteria/movimientos', icono: ClipboardList, etapa: 4 },
    { etiqueta: 'Dispositivos',     href: '/porteria/dispositivos', icono: Settings,      etapa: 6 },
    { etiqueta: 'Croquis',          href: '/porteria/croquis',      icono: MapPin,        etapa: 6 },
  ],

  CONTROL_PASO: [
    { etiqueta: 'Panel',            href: '/control',          icono: Home,          etapa: 1 },
    { etiqueta: 'Control de paso',  href: '/control/paso',     icono: ScanLine,      etapa: 5 },
    { etiqueta: 'Registro',         href: '/control/registro', icono: ClipboardList, etapa: 5 },
  ],

  MAESTRANZA: [
    { etiqueta: 'Panel',            href: '/maestranza',        icono: Home,       etapa: 1 },
    { etiqueta: 'Dispositivos',     href: '/maestranza/dispositivos', icono: Settings,   etapa: 6 },
    { etiqueta: 'Croquis',          href: '/maestranza/croquis',      icono: MapPin,     etapa: 6 },
    { etiqueta: 'Mis tareas',       href: '/maestranza/tareas', icono: ListChecks, etapa: 8 },
    { etiqueta: 'Fichaje',          href: '/maestranza/fichaje', icono: Wrench,    etapa: 8 },
  ],

  PROFESOR: [
    { etiqueta: 'Panel',            href: '/profesor',           icono: Home,          etapa: 1 },
    { etiqueta: 'Mis grupos',       href: '/profesor/grupos',    icono: Users,         etapa: 8 },
    { etiqueta: 'Horarios',         href: '/profesor/horarios',  icono: CalendarDays,  etapa: 8 },
    { etiqueta: 'Rutinas',          href: '/profesor/rutinas',   icono: ClipboardList, etapa: 8 },
    { etiqueta: 'Asistencia',       href: '/profesor/asistencia', icono: ListChecks,   etapa: 8 },
  ],

  CONCESIONARIO: [
    { etiqueta: 'Panel',            href: '/concesion',          icono: Home,        etapa: 1 },
    { etiqueta: 'Punto de venta',   href: '/concesion/ventas',   icono: ShoppingBag, etapa: 8 },
  ],

  MEDICO: [
    { etiqueta: 'Panel',            href: '/medico',             icono: Home,        etapa: 1 },
    { etiqueta: 'Cola de espera',   href: '/medico/cola',        icono: Stethoscope, etapa: 5 },
    { etiqueta: 'Historial',        href: '/medico/historial',   icono: FileText,    etapa: 5 },
    { etiqueta: 'Aptos por vencer', href: '/medico/vencimientos', icono: Bell,       etapa: 5 },
  ],

  SOCIO: [
    { etiqueta: 'Mi panel',         href: '/socio',              icono: Home,        etapa: 1 },
    { etiqueta: 'Mi grupo familiar', href: '/socio/familia',     icono: Users,       etapa: 7 },
    { etiqueta: 'Mi cuota',         href: '/socio/cuota',        icono: CreditCard,  etapa: 7 },
    { etiqueta: 'Mis reservas',     href: '/socio/reservas',     icono: CalendarDays, etapa: 7 },
    { etiqueta: 'Mi credencial',    href: '/socio/credencial',   icono: ScanLine,    etapa: 7 },
    { etiqueta: 'Mi apto médico',   href: '/socio/apto',         icono: Stethoscope, etapa: 7 },
    { etiqueta: 'Notificaciones',   href: '/socio/avisos',       icono: Bell,        etapa: 7 },
  ],
};

/** Etapa del plan ya construida. Subir este número enciende los ítems de esa etapa. */
export const ETAPA_ACTUAL = 6;

export function disponible(item: ItemMenu): boolean {
  return item.etapa <= ETAPA_ACTUAL;
}
