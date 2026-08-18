/**
 * Matriz de roles del club — única fuente de verdad.
 *
 * Todo lo que un rol puede hacer se declara acá, no disperso en cada pantalla. Si hay
 * que discutir un permiso, se discute mirando este archivo.
 *
 * La cadena de designación no es una convención nuestra: el art. 43 inc. d del estatuto
 * pone al Secretario a cargo del personal administrativo y de servicios, y el
 * Administrador General designa a Secretario y Tesorero.
 */

import { Rol } from '@prisma/client';
import { RUTA_POR_ROL } from '@/lib/rutas';

export { Rol };

/** Hasta dónde llega lo que ve un rol. */
export type Alcance =
  | 'club'    // todo el club
  | 'predio'  // sólo los predios que tenga asignados
  | 'propio'; // sólo lo suyo (su cartera, sus grupos, su ficha)

export interface DefinicionRol {
  /** Cómo se lo nombra en pantalla. */
  etiqueta: string;
  /** Ruta base de su panel. */
  ruta: string;
  alcance: Alcance;
  /** Roles que este rol puede dar de alta, modificar y dar de baja. */
  designa: Rol[];
  /** Capacidades que habilita. Ver `Capacidad`. */
  puede: Capacidad[];
}

/**
 * Capacidades, no pantallas. Una pantalla puede exigir varias, y una capacidad puede
 * aparecer en varias pantallas — por eso se nombran por lo que la persona HACE.
 */
export type Capacidad =
  | 'configurar_plataforma'   // secrets, claves de API, cuentas cloud a cloud
  | 'designar_roles'
  | 'ver_socios'
  | 'administrar_socios'
  | 'administrar_estructura'  // predios, alojamientos, espacios, accesos, actividades
  | 'actos_estatutarios'      // admisión, licencia, cesantía, reingreso, sanciones
  | 'ver_cobranzas'
  | 'administrar_tarifario'
  | 'administrar_cuotas'
  | 'cobrar'                  // abrir caja y registrar cobros
  | 'cobrar_domicilio'
  | 'administrar_egresos'
  | 'arquear_cajas'           // cerrar y consolidar cajas de todo el club
  | 'operar_porteria'         // identificar, decidir, cobrar y abrir
  | 'operar_control'          // identificar, verificar y abrir; nunca cobra
  | 'administrar_predio'      // disponibilidad, calendario, dispositivos
  | 'reservar_prioritario'
  | 'ver_personal'            // control horario de los dependientes del predio
  | 'fichar'                  // marcar su propia entrada y salida
  | 'emitir_apto_medico'
  | 'administrar_grupos'      // grupos, horarios y rutinas de una actividad
  | 'administrar_concesion'
  | 'ver_ocupacion'
  | 'panel_socio';

export const ROLES: Record<Rol, DefinicionRol> = {
  ADMIN_GENERAL: {
    etiqueta: 'Administrador General',
    ruta: RUTA_POR_ROL.ADMIN_GENERAL,
    alcance: 'club',
    designa: [Rol.SECRETARIO, Rol.TESORERO],
    puede: [
      'configurar_plataforma',
      'designar_roles',
      'ver_socios',
      'ver_cobranzas',
      'ver_ocupacion',
    ],
  },

  SECRETARIO: {
    etiqueta: 'Secretario',
    ruta: RUTA_POR_ROL.SECRETARIO,
    alcance: 'club',
    // Designa a todos menos a sí mismo y al Tesorero, que dependen del Administrador.
    // El Cobrador tampoco: lo da de alta el Tesorero, de quien depende.
    designa: [
      Rol.JEFE_PREDIO,
      Rol.PORTERO,
      Rol.CONTROL_PASO,
      Rol.MAESTRANZA,
      Rol.PROFESOR,
      Rol.CONCESIONARIO,
      Rol.MEDICO,
      Rol.SOCIO,
    ],
    puede: [
      'designar_roles',
      'ver_socios',
      'administrar_socios',
      'administrar_estructura',
      'actos_estatutarios',
      'ver_ocupacion',
    ],
  },

  TESORERO: {
    etiqueta: 'Tesorero',
    ruta: RUTA_POR_ROL.TESORERO,
    alcance: 'club',
    designa: [Rol.COBRADOR],
    puede: [
      'designar_roles',
      'ver_socios',
      'ver_cobranzas',
      'administrar_tarifario',
      'administrar_cuotas',
      'administrar_egresos',
      'arquear_cajas',
      'cobrar',
    ],
  },

  COBRADOR: {
    etiqueta: 'Cobrador',
    ruta: RUTA_POR_ROL.COBRADOR,
    alcance: 'propio',
    designa: [],
    puede: ['cobrar_domicilio'],
  },

  JEFE_PREDIO: {
    etiqueta: 'Jefe de predio',
    ruta: RUTA_POR_ROL.JEFE_PREDIO,
    alcance: 'predio',
    designa: [],
    puede: [
      'administrar_predio',
      'reservar_prioritario',
      'ver_personal',
      'ver_ocupacion',
      'ver_socios',
    ],
  },

  PORTERO: {
    etiqueta: 'Portero',
    ruta: RUTA_POR_ROL.PORTERO,
    alcance: 'predio',
    designa: [],
    puede: ['operar_porteria', 'cobrar', 'ver_socios', 'fichar'],
  },

  CONTROL_PASO: {
    etiqueta: 'Punto de control',
    ruta: RUTA_POR_ROL.CONTROL_PASO,
    alcance: 'predio',
    designa: [],
    // Deliberadamente sin 'cobrar' ni 'ver_cobranzas': este puesto no toca dinero.
    puede: ['operar_control', 'fichar'],
  },

  MAESTRANZA: {
    etiqueta: 'Maestranza',
    ruta: RUTA_POR_ROL.MAESTRANZA,
    alcance: 'predio',
    designa: [],
    // Funciones pendientes de definición: por ahora sólo ficha entrada y salida.
    puede: ['fichar'],
  },

  PROFESOR: {
    etiqueta: 'Profesor',
    ruta: RUTA_POR_ROL.PROFESOR,
    alcance: 'propio',
    designa: [],
    puede: ['administrar_grupos', 'ver_socios', 'fichar'],
  },

  CONCESIONARIO: {
    etiqueta: 'Concesionario',
    ruta: RUTA_POR_ROL.CONCESIONARIO,
    alcance: 'propio',
    designa: [],
    // Alcance pendiente de definición.
    puede: ['administrar_concesion'],
  },

  MEDICO: {
    etiqueta: 'Médico',
    ruta: RUTA_POR_ROL.MEDICO,
    alcance: 'club',
    designa: [],
    puede: ['emitir_apto_medico', 'ver_socios'],
  },

  SOCIO: {
    etiqueta: 'Socio',
    ruta: RUTA_POR_ROL.SOCIO,
    alcance: 'propio',
    designa: [],
    puede: ['panel_socio'],
  },
};

/** Roles en el orden en que conviene mostrarlos: del gobierno hacia afuera. */
export const ORDEN_ROLES: Rol[] = [
  Rol.ADMIN_GENERAL,
  Rol.SECRETARIO,
  Rol.TESORERO,
  Rol.COBRADOR,
  Rol.JEFE_PREDIO,
  Rol.PORTERO,
  Rol.CONTROL_PASO,
  Rol.MAESTRANZA,
  Rol.MEDICO,
  Rol.PROFESOR,
  Rol.CONCESIONARIO,
  Rol.SOCIO,
];

// ─── Consultas ───────────────────────────────────────────────────────────────

export function puede(rol: Rol, capacidad: Capacidad): boolean {
  return ROLES[rol].puede.includes(capacidad);
}

/** ¿Alguno de los roles de la persona habilita esta capacidad? */
export function puedeAlguno(roles: Rol[], capacidad: Capacidad): boolean {
  return roles.some((r) => puede(r, capacidad));
}

export function puedeDesignar(rol: Rol, objetivo: Rol): boolean {
  return ROLES[rol].designa.includes(objetivo);
}

/** Todos los roles que la persona puede dar de alta, sin repetir. */
export function designables(roles: Rol[]): Rol[] {
  const todos = new Set<Rol>();
  for (const r of roles) for (const d of ROLES[r].designa) todos.add(d);
  return ORDEN_ROLES.filter((r) => todos.has(r));
}

/**
 * A qué panel mandar a alguien que acaba de entrar. Si acumula roles —el Tesorero que
 * también es socio— gana el de mayor gobierno, y después puede cambiar de vista.
 */
export function rutaInicial(roles: Rol[]): string {
  const principal = ORDEN_ROLES.find((r) => roles.includes(r));
  return principal ? ROLES[principal].ruta : '/';
}

/** ¿El rol está limitado a los predios que tenga asignados? */
export function acotadoAPredio(rol: Rol): boolean {
  return ROLES[rol].alcance === 'predio';
}
