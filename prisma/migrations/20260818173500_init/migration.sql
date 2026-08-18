-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN_GENERAL', 'SECRETARIO', 'TESORERO', 'COBRADOR', 'JEFE_PREDIO', 'PORTERO', 'CONTROL_PASO', 'MAESTRANZA', 'PROFESOR', 'CONCESIONARIO', 'MEDICO', 'SOCIO');

-- CreateEnum
CREATE TYPE "CategoriaSocio" AS ENUM ('ACTIVO', 'CADETE', 'VITALICIO', 'TRANSEUNTE', 'HONORARIO', 'PRESIDENTE_HONORARIO');

-- CreateEnum
CREATE TYPE "EstadoSocio" AS ENUM ('AL_DIA', 'MOROSO', 'EMPLAZADO', 'CESANTE', 'SUSPENDIDO', 'LICENCIA', 'EXPULSADO');

-- CreateEnum
CREATE TYPE "TipoAcceso" AS ENUM ('PORTERIA', 'CONTROL');

-- CreateEnum
CREATE TYPE "TipoAlojamiento" AS ENUM ('BUNGALOW', 'CABANA', 'PARCELA', 'CARPA', 'CASILLA', 'VIVIENDA');

-- CreateEnum
CREATE TYPE "TipoEspacio" AS ENUM ('CANCHA', 'QUINCHO');

-- CreateEnum
CREATE TYPE "UnidadReserva" AS ENUM ('NOCHE', 'HORA', 'BLOQUE');

-- CreateEnum
CREATE TYPE "ModoReserva" AS ENUM ('ANTICIPADA', 'EN_EL_MOMENTO', 'AMBAS');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('ACTIVA', 'CONFIRMADA', 'CANCELADA', 'AUSENTE');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'DEBITO_AUTOMATICO');

-- CreateEnum
CREATE TYPE "CondicionPersona" AS ENUM ('SOCIO', 'NO_SOCIO', 'JUBILADO', 'DISCAPACIDAD', 'MENOR_5', 'ACOMPANANTE', 'INVITADO');

-- CreateEnum
CREATE TYPE "ResultadoIngreso" AS ENUM ('PERMITIDO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA', 'CONDONADA');

-- CreateEnum
CREATE TYPE "TipoHabilitacion" AS ENUM ('APTO_MEDICO', 'DERECHO_PILETA');

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "usuario" TEXT,
    "passwordHash" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "huellaEnrolada" BOOLEAN NOT NULL DEFAULT false,
    "huellaDedo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolAsignado" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "predioId" TEXT,
    "designadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolAsignado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoFamiliar" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrupoFamiliar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Socio" (
    "id" TEXT NOT NULL,
    "numeroSocio" INTEGER NOT NULL,
    "personaId" TEXT NOT NULL,
    "categoria" "CategoriaSocio" NOT NULL DEFAULT 'ACTIVO',
    "estado" "EstadoSocio" NOT NULL DEFAULT 'AL_DIA',
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "permisoHasta" TIMESTAMP(3),
    "grupoFamiliarId" TEXT,
    "esTitular" BOOLEAN NOT NULL DEFAULT false,
    "cobradorId" TEXT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Predio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "direccion" TEXT,
    "conexionSatelital" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Predio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acceso" (
    "id" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoAcceso" NOT NULL,
    "dispositivoTipo" TEXT,
    "dispositivoRef" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alojamiento" (
    "id" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoAlojamiento" NOT NULL,
    "capacidadBase" INTEGER NOT NULL DEFAULT 4,
    "capacidadMax" INTEGER NOT NULL DEFAULT 6,
    "modoReserva" "ModoReserva" NOT NULL DEFAULT 'ANTICIPADA',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alojamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Espacio" (
    "id" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEspacio" NOT NULL,
    "unidad" "UnidadReserva" NOT NULL DEFAULT 'HORA',
    "bloqueHoras" INTEGER,
    "altaDemanda" BOOLEAN NOT NULL DEFAULT false,
    "ventanaCancelacionHoras" INTEGER NOT NULL DEFAULT 12,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Espacio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modalidad" TEXT NOT NULL DEFAULT 'mensual',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadPredio" (
    "actividadId" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,

    CONSTRAINT "ActividadPredio_pkey" PRIMARY KEY ("actividadId","predioId")
);

-- CreateTable
CREATE TABLE "Habilitacion" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "tipo" "TipoHabilitacion" NOT NULL,
    "autorizado" BOOLEAN NOT NULL DEFAULT true,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "novedades" TEXT,
    "emisorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habilitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingreso" (
    "id" TEXT NOT NULL,
    "accesoId" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "personaId" TEXT,
    "nombre" TEXT NOT NULL,
    "condicion" "CondicionPersona" NOT NULL DEFAULT 'SOCIO',
    "resultado" "ResultadoIngreso" NOT NULL,
    "motivo" TEXT,
    "cobroId" TEXT,
    "ocurridoEn" TIMESTAMP(3) NOT NULL,
    "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ingreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitado" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fila" TEXT,
    "adjudicatarioId" TEXT,
    "fechaAdjudicacion" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutorizacionEstadia" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "personas" TEXT[],
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "aprobada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutorizacionEstadia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "alojamientoId" TEXT,
    "espacioId" TEXT,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "personas" INTEGER NOT NULL DEFAULT 1,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'ACTIVA',
    "prioritaria" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTarifario" (
    "id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "predioId" TEXT,
    "condicion" "CondicionPersona" NOT NULL DEFAULT 'SOCIO',
    "precio" DECIMAL(12,2) NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemTarifario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuota" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "vencimiento" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caja" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "accesoId" TEXT,
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "arqueo" JSONB,

    CONSTRAINT "Caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cobro" (
    "id" TEXT NOT NULL,
    "claveUnica" TEXT NOT NULL,
    "socioId" TEXT,
    "pagador" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "accesoId" TEXT,
    "cajaId" TEXT,
    "operadorId" TEXT NOT NULL,
    "medioPago" "MedioPago" NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "items" JSONB NOT NULL,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "comprobante" JSONB,
    "ocurridoEn" TIMESTAMP(3) NOT NULL,
    "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Egreso" (
    "id" TEXT NOT NULL,
    "predioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "comprobante" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Egreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fichaje" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "predioId" TEXT NOT NULL,
    "entrada" TIMESTAMP(3) NOT NULL,
    "salida" TIMESTAMP(3),

    CONSTRAINT "Fichaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_dni_key" ON "Persona"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_usuario_key" ON "Persona"("usuario");

-- CreateIndex
CREATE INDEX "Persona_usuario_idx" ON "Persona"("usuario");

-- CreateIndex
CREATE INDEX "Persona_nombre_idx" ON "Persona"("nombre");

-- CreateIndex
CREATE INDEX "RolAsignado_rol_idx" ON "RolAsignado"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "RolAsignado_personaId_rol_predioId_key" ON "RolAsignado"("personaId", "rol", "predioId");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_numeroSocio_key" ON "Socio"("numeroSocio");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_personaId_key" ON "Socio"("personaId");

-- CreateIndex
CREATE INDEX "Socio_estado_idx" ON "Socio"("estado");

-- CreateIndex
CREATE INDEX "Socio_categoria_idx" ON "Socio"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "Predio_slug_key" ON "Predio"("slug");

-- CreateIndex
CREATE INDEX "Acceso_predioId_tipo_idx" ON "Acceso"("predioId", "tipo");

-- CreateIndex
CREATE INDEX "Alojamiento_predioId_tipo_idx" ON "Alojamiento"("predioId", "tipo");

-- CreateIndex
CREATE INDEX "Espacio_predioId_tipo_idx" ON "Espacio"("predioId", "tipo");

-- CreateIndex
CREATE INDEX "Habilitacion_socioId_tipo_hasta_idx" ON "Habilitacion"("socioId", "tipo", "hasta");

-- CreateIndex
CREATE UNIQUE INDEX "Ingreso_cobroId_key" ON "Ingreso"("cobroId");

-- CreateIndex
CREATE INDEX "Ingreso_predioId_ocurridoEn_idx" ON "Ingreso"("predioId", "ocurridoEn");

-- CreateIndex
CREATE INDEX "Ingreso_personaId_idx" ON "Ingreso"("personaId");

-- CreateIndex
CREATE INDEX "Invitado_socioId_idx" ON "Invitado"("socioId");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_predioId_numero_key" ON "Lote"("predioId", "numero");

-- CreateIndex
CREATE INDEX "AutorizacionEstadia_loteId_hasta_idx" ON "AutorizacionEstadia"("loteId", "hasta");

-- CreateIndex
CREATE INDEX "Reserva_desde_hasta_idx" ON "Reserva"("desde", "hasta");

-- CreateIndex
CREATE INDEX "Reserva_socioId_idx" ON "Reserva"("socioId");

-- CreateIndex
CREATE INDEX "ItemTarifario_concepto_condicion_vigenciaDesde_idx" ON "ItemTarifario"("concepto", "condicion", "vigenciaDesde");

-- CreateIndex
CREATE INDEX "Cuota_estado_idx" ON "Cuota"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Cuota_socioId_periodo_key" ON "Cuota"("socioId", "periodo");

-- CreateIndex
CREATE INDEX "Caja_predioId_estado_idx" ON "Caja"("predioId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Cobro_claveUnica_key" ON "Cobro"("claveUnica");

-- CreateIndex
CREATE INDEX "Cobro_predioId_ocurridoEn_idx" ON "Cobro"("predioId", "ocurridoEn");

-- CreateIndex
CREATE INDEX "Cobro_socioId_idx" ON "Cobro"("socioId");

-- CreateIndex
CREATE INDEX "Egreso_fecha_idx" ON "Egreso"("fecha");

-- CreateIndex
CREATE INDEX "Fichaje_predioId_entrada_idx" ON "Fichaje"("predioId", "entrada");

-- AddForeignKey
ALTER TABLE "RolAsignado" ADD CONSTRAINT "RolAsignado_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolAsignado" ADD CONSTRAINT "RolAsignado_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_grupoFamiliarId_fkey" FOREIGN KEY ("grupoFamiliarId") REFERENCES "GrupoFamiliar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_cobradorId_fkey" FOREIGN KEY ("cobradorId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceso" ADD CONSTRAINT "Acceso_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alojamiento" ADD CONSTRAINT "Alojamiento_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Espacio" ADD CONSTRAINT "Espacio_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadPredio" ADD CONSTRAINT "ActividadPredio_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadPredio" ADD CONSTRAINT "ActividadPredio_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habilitacion" ADD CONSTRAINT "Habilitacion_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habilitacion" ADD CONSTRAINT "Habilitacion_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_accesoId_fkey" FOREIGN KEY ("accesoId") REFERENCES "Acceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "Cobro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitado" ADD CONSTRAINT "Invitado_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_adjudicatarioId_fkey" FOREIGN KEY ("adjudicatarioId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorizacionEstadia" ADD CONSTRAINT "AutorizacionEstadia_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_alojamientoId_fkey" FOREIGN KEY ("alojamientoId") REFERENCES "Alojamiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "Espacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTarifario" ADD CONSTRAINT "ItemTarifario_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuota" ADD CONSTRAINT "Cuota_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_accesoId_fkey" FOREIGN KEY ("accesoId") REFERENCES "Acceso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_accesoId_fkey" FOREIGN KEY ("accesoId") REFERENCES "Acceso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobro" ADD CONSTRAINT "Cobro_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Egreso" ADD CONSTRAINT "Egreso_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichaje" ADD CONSTRAINT "Fichaje_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichaje" ADD CONSTRAINT "Fichaje_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "Predio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
