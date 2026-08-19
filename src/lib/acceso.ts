/**
 * ¿Pasa o no pasa?
 *
 * Es la única función que decide un ingreso. La consultan la portería, los puntos de
 * control y —más adelante— el lector de huellas y el QR del socio. Todos esos caminos
 * sólo resuelven QUIÉN es la persona; qué hacer con ella se decide acá.
 *
 * Escrita como función pura sobre datos ya resueltos, para poder probar cada regla del
 * estatuto sin base de datos ni molinete.
 */

/** Los tres carteles de la señalética. Ver `.cartel-*` en globals.css. */
export type Veredicto = 'PASA' | 'AVISO' | 'NO_PASA';

export interface SituacionDeAcceso {
  tipoAcceso: 'PORTERIA' | 'CONTROL';
  fecha: Date;

  /** Falso para quien no está en el padrón: visitas, invitados, turistas. */
  esSocio: boolean;
  estadoSocio?: string;
  categoria?: string;
  /** Sólo transeúntes: su permiso vence. */
  permisoHasta?: Date | null;

  /** Vencimiento del apto médico, si tiene uno. */
  aptoMedicoHasta?: Date | null;
  /** Si el médico lo autorizó o lo rechazó expresamente. */
  aptoMedicoAutorizado?: boolean;
  /** Habilitaciones con vigencia que tiene hoy, por ejemplo el derecho de pileta. */
  derechosVigentes?: string[];

  /** Qué exige este puesto. Sale de la configuración del acceso. */
  exigeAptoMedico?: boolean;
  exigeDerecho?: string | null;

  /** Para el barrio de fin de semana: permiso de estadía vigente a su nombre. */
  autorizacionEstadiaVigente?: boolean;

  /** Condición declarada por el portero para quien no es socio. */
  condicionDeclarada?: string;
}

export interface DecisionAcceso {
  veredicto: Veredicto;
  /** Texto grande del cartel, legible a varios metros. */
  titulo: string;
  /** La explicación, abajo y más chica. */
  detalle: string;
  /**
   * Con qué condición cobrarle en el tarifario. Nulo significa que no se cobra: o es
   * socio con derecho, o directamente no pasa.
   */
  cobrarComo: string | null;
  /** Código corto para el registro de ingresos. */
  motivo: string;
}

function vencido(hasta: Date | null | undefined, fecha: Date): boolean {
  return !hasta || hasta < fecha;
}

/**
 * Los estados que cierran la puerta.
 *
 * El EMPLAZADO **no** está acá a propósito. El art. 28 le da diez días para regularizar
 * y dice que pierde sus derechos *el cesante*, no él. Así que entra, con aviso.
 */
const ESTADOS_QUE_NO_PASAN: Record<string, string> = {
  CESANTE: 'Su condición de socio está dada de baja por falta de pago (art. 28).',
  EXPULSADO: 'Fue expulsado del club.',
  SUSPENDIDO: 'Está suspendido por el Tribunal de Disciplina.',
};

export function resolverAcceso(s: SituacionDeAcceso): DecisionAcceso {
  const enPorteria = s.tipoAcceso === 'PORTERIA';

  // ── 1. Quien no es socio ───────────────────────────────────────────────────
  if (!s.esSocio) {
    // En un punto de control interno no se cobra: o tiene derecho, o no pasa.
    if (!enPorteria) {
      return {
        veredicto: 'NO_PASA',
        titulo: 'NO PASA',
        detalle: 'Este sector es para socios. Pasá por la portería.',
        cobrarComo: null,
        motivo: 'no_socio_en_control',
      };
    }

    // El permiso de estadía del barrio de fin de semana habilita sin cargo: el
    // adjudicatario ya declaró a esta persona (arts. 9 y 10 del reglamento).
    if (s.autorizacionEstadiaVigente) {
      return {
        veredicto: 'PASA',
        titulo: 'PASE',
        detalle: 'Tiene permiso de estadía vigente en una vivienda del barrio.',
        cobrarComo: null,
        motivo: 'autorizacion_estadia',
      };
    }

    const condicion = s.condicionDeclarada ?? 'NO_SOCIO';
    if (condicion === 'MENOR_5') {
      return {
        veredicto: 'PASA',
        titulo: 'PASE',
        detalle: 'Menor de 5 años: sin cargo.',
        cobrarComo: null,
        motivo: 'menor_5',
      };
    }

    return {
      veredicto: 'AVISO',
      titulo: 'COBRAR',
      detalle: 'No es socio: corresponde cobrarle la entrada.',
      cobrarComo: condicion,
      motivo: 'no_socio',
    };
  }

  // ── 2. Estados que cierran la puerta ───────────────────────────────────────
  const bloqueo = s.estadoSocio ? ESTADOS_QUE_NO_PASAN[s.estadoSocio] : undefined;
  if (bloqueo) {
    return {
      veredicto: 'NO_PASA',
      titulo: 'NO PASA',
      detalle: bloqueo,
      cobrarComo: null,
      motivo: `estado_${(s.estadoSocio ?? '').toLowerCase()}`,
    };
  }

  // ── 3. Transeúnte con el permiso vencido ───────────────────────────────────
  // Los beneficios caducan solos al vencer el permiso (art. 14 inc. e).
  if (s.categoria === 'TRANSEUNTE' && vencido(s.permisoHasta, s.fecha)) {
    if (!enPorteria) {
      return {
        veredicto: 'NO_PASA',
        titulo: 'NO PASA',
        detalle: 'Su permiso de transeúnte venció. Pasá por la portería.',
        cobrarComo: null,
        motivo: 'permiso_vencido',
      };
    }
    return {
      veredicto: 'AVISO',
      titulo: 'COBRAR',
      detalle: 'Su permiso de transeúnte venció: entra pagando como no socio.',
      cobrarComo: 'NO_SOCIO',
      motivo: 'permiso_vencido',
    };
  }

  // ── 4. Licencia: entra, pero pagando ───────────────────────────────────────
  // El art. 25 es explícito: mientras dura la licencia, para el uso de las
  // instalaciones se lo considera COMO NO SOCIO.
  if (s.estadoSocio === 'LICENCIA') {
    if (!enPorteria) {
      return {
        veredicto: 'NO_PASA',
        titulo: 'NO PASA',
        detalle: 'Está en licencia: para usar las instalaciones pasá por la portería (art. 25).',
        cobrarComo: null,
        motivo: 'licencia_en_control',
      };
    }
    return {
      veredicto: 'AVISO',
      titulo: 'COBRAR',
      detalle: 'Está en licencia: entra pagando como no socio (art. 25).',
      cobrarComo: 'NO_SOCIO',
      motivo: 'licencia',
    };
  }

  // ── 5. Lo que exige este puesto ────────────────────────────────────────────
  if (s.exigeAptoMedico) {
    if (s.aptoMedicoAutorizado === false) {
      return {
        veredicto: 'NO_PASA',
        titulo: 'NO PASA',
        detalle: 'El médico no lo autorizó. Tiene que volver a revisarse.',
        cobrarComo: null,
        motivo: 'apto_rechazado',
      };
    }
    if (vencido(s.aptoMedicoHasta, s.fecha)) {
      return {
        veredicto: 'NO_PASA',
        titulo: 'SIN APTO MÉDICO',
        detalle: 'La revisación está vencida. Pasá por enfermería antes de usar la pileta.',
        cobrarComo: null,
        motivo: 'apto_vencido',
      };
    }
  }

  if (s.exigeDerecho && !(s.derechosVigentes ?? []).includes(s.exigeDerecho)) {
    if (!enPorteria) {
      return {
        veredicto: 'NO_PASA',
        titulo: 'SIN DERECHO',
        detalle: 'No tiene el derecho de temporada. Podés abonar el día en la portería.',
        cobrarComo: null,
        motivo: 'sin_derecho',
      };
    }
    return {
      veredicto: 'AVISO',
      titulo: 'COBRAR',
      detalle: 'No tiene el derecho de temporada: corresponde cobrarle el día.',
      cobrarComo: 'SOCIO',
      motivo: 'sin_derecho',
    };
  }

  // ── 6. Moroso y emplazado: pasan, con aviso ────────────────────────────────
  if (s.estadoSocio === 'EMPLAZADO') {
    return {
      veredicto: 'AVISO',
      titulo: 'REGULARIZAR',
      detalle: 'Debe tres cuotas y está emplazado. Tiene diez días antes de la cesantía (art. 28).',
      cobrarComo: null,
      motivo: 'emplazado',
    };
  }
  if (s.estadoSocio === 'MOROSO') {
    return {
      veredicto: 'AVISO',
      titulo: 'REGULARIZAR',
      detalle: 'Tiene cuotas impagas. Pasá por Tesorería.',
      cobrarComo: null,
      motivo: 'moroso',
    };
  }

  // ── 7. Todo en orden ───────────────────────────────────────────────────────
  return {
    veredicto: 'PASA',
    titulo: 'PASE',
    detalle: 'Socio al día.',
    cobrarComo: null,
    motivo: 'al_dia',
  };
}

/** Clase CSS del cartel según el veredicto. */
export function claseCartel(v: Veredicto): string {
  return v === 'PASA' ? 'cartel-ok' : v === 'AVISO' ? 'cartel-alerta' : 'cartel-no';
}

/**
 * Qué concepto del tarifario corresponde cobrar según la decisión.
 *
 * Va aparte y no dentro de la decisión para no repetirlo en cada rama: casi siempre es
 * la entrada, y la excepción es cuando falta el derecho de temporada, que se cobra por
 * día del servicio puntual.
 */
export function conceptoACobrar(d: DecisionAcceso, exigeDerecho?: string | null): string | null {
  if (!d.cobrarComo) return null;
  if (d.motivo === "sin_derecho") {
    return exigeDerecho === "DERECHO_PILETA" ? "Día de pileta" : "Entrada";
  }
  return "Entrada";
}
