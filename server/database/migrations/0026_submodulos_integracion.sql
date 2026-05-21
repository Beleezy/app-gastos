-- Migración 0026: tablas para los submódulos integrados
-- (suscripciones de servicios, metas, presupuestos por categoría, etiquetas).
--
-- Ver docs/INTEGRACION-SUBMODULOS.md para diseño y rationale.
-- Los submódulos previamente vivían 100% en localStorage; esta migración
-- los lleva a Postgres manteniendo la API pública de los composables
-- existentes.

-- ── Enums ──
DO $$ BEGIN
  CREATE TYPE "periodicidad_suscripcion" AS ENUM (
    'semanal', 'quincenal', 'mensual', 'bimestral',
    'trimestral', 'semestral', 'anual'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "tipo_meta" AS ENUM ('ahorro', 'deuda', 'gasto_limite');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Suscripciones de servicios ──
-- Nombre diferenciado de `suscripciones_push` (Web Push API).
CREATE TABLE IF NOT EXISTS "suscripciones_servicios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "nombre" varchar(120) NOT NULL,
  "monto" numeric(12, 2) NOT NULL,
  "periodicidad" "periodicidad_suscripcion" NOT NULL DEFAULT 'mensual',
  "fecha_inicio" date NOT NULL,
  "categoria_id" uuid REFERENCES "categorias"("id") ON DELETE SET NULL,
  "icono" varchar(16) DEFAULT '🔁',
  "color" varchar(16) DEFAULT '#3b82f6',
  "url" text,
  "notas" text,
  "activa" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "subs_servicios_usuario_idx"
  ON "suscripciones_servicios" ("usuario_id", "activa");

-- ── Metas ──
CREATE TABLE IF NOT EXISTS "metas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "nombre" varchar(120) NOT NULL,
  "tipo" "tipo_meta" NOT NULL,
  "monto_objetivo" numeric(12, 2) NOT NULL,
  "fecha_limite" date,
  "icono" varchar(16) DEFAULT '🎯',
  "color" varchar(16) DEFAULT '#10b981',
  "archivada" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "metas_usuario_idx"
  ON "metas" ("usuario_id", "archivada");

-- Movimientos de meta (log de aportes / consumos).
-- `origen_tipo` permite enlazar al recurso real que generó el movimiento
-- (ahorro, pago_deuda, gasto) sin FK rígida para evitar acoplamiento.
CREATE TABLE IF NOT EXISTS "meta_movimientos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meta_id" uuid NOT NULL REFERENCES "metas"("id") ON DELETE CASCADE,
  "monto" numeric(12, 2) NOT NULL,
  "fecha" date NOT NULL,
  "nota" text,
  "origen_tipo" varchar(24),
  "origen_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "meta_movs_meta_idx"
  ON "meta_movimientos" ("meta_id", "fecha");
CREATE INDEX IF NOT EXISTS "meta_movs_origen_idx"
  ON "meta_movimientos" ("origen_tipo", "origen_id");

-- ── Presupuestos por categoría ──
CREATE TABLE IF NOT EXISTS "presupuestos_categoria" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "categoria_id" uuid NOT NULL REFERENCES "categorias"("id") ON DELETE CASCADE,
  "monto_mensual" numeric(12, 2) NOT NULL,
  "alerta_umbral" integer NOT NULL DEFAULT 80
    CHECK ("alerta_umbral" BETWEEN 0 AND 100),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Un único presupuesto por (usuario, categoria).
CREATE UNIQUE INDEX IF NOT EXISTS "pcat_usuario_categoria_uq"
  ON "presupuestos_categoria" ("usuario_id", "categoria_id");

-- ── Etiquetas ──
CREATE TABLE IF NOT EXISTS "etiquetas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "nombre" varchar(40) NOT NULL,
  "color" varchar(16) NOT NULL DEFAULT '#3b82f6',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "etq_usuario_nombre_uq"
  ON "etiquetas" ("usuario_id", "nombre");

-- Asignaciones polimórficas (recurso_tipo = 'gasto' | 'planificado' | 'futuro').
-- Sin FK rígida hacia el recurso para no acoplar al schema; los DELETE en
-- cascada deben gestionarse desde el lado de la app o un trigger
-- específico si fuera necesario.
CREATE TABLE IF NOT EXISTS "etiquetas_asign" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "etiqueta_id" uuid NOT NULL REFERENCES "etiquetas"("id") ON DELETE CASCADE,
  "recurso_tipo" varchar(24) NOT NULL,
  "recurso_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "etq_asign_uq"
  ON "etiquetas_asign" ("etiqueta_id", "recurso_tipo", "recurso_id");
CREATE INDEX IF NOT EXISTS "etq_asign_recurso_idx"
  ON "etiquetas_asign" ("recurso_tipo", "recurso_id");

-- Trigger: cuando se borra un gasto/planificado/futuro, limpiar sus
-- asignaciones de etiquetas (best-effort sin FK).
CREATE OR REPLACE FUNCTION "etiquetas_asign_limpiar"()
RETURNS trigger AS $$
BEGIN
  DELETE FROM "etiquetas_asign"
   WHERE "recurso_id" = OLD."id"
     AND "recurso_tipo" = TG_ARGV[0];
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "etq_asign_limpiar_gasto" ON "gastos";
CREATE TRIGGER "etq_asign_limpiar_gasto"
  AFTER DELETE ON "gastos"
  FOR EACH ROW EXECUTE FUNCTION "etiquetas_asign_limpiar"('gasto');

DROP TRIGGER IF EXISTS "etq_asign_limpiar_planif" ON "gastos_planificados";
CREATE TRIGGER "etq_asign_limpiar_planif"
  AFTER DELETE ON "gastos_planificados"
  FOR EACH ROW EXECUTE FUNCTION "etiquetas_asign_limpiar"('planificado');
