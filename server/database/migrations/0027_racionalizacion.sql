-- Migración 0027: racionalización de módulos + control de acceso y familia.
--
-- 1) Elimina módulos descartados: cuentas/transferencias, suscripciones de
--    servicios, etiquetas, metas genéricas, suscripciones push e invitaciones
--    de espacio (reemplazadas por alta directa de miembros).
-- 2) Añade control de acceso al sistema por allowlist (superadmin).
-- 3) Añade "control total" de familia: registrado_por en gastos/ingresos.
--
-- Estilo idempotente (IF EXISTS / IF NOT EXISTS / DO$$) compatible con
-- scripts/apply-migrations.mjs.
-- ⚠️ BACKUP recomendado: elimina datos de los módulos descartados.

-- ── Quitar columnas cuenta_id (eran columnas sueltas sin FK) + sus índices ──
DROP INDEX IF EXISTS "gastos_cuenta_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ingresos_cuenta_idx";--> statement-breakpoint
ALTER TABLE "gastos" DROP COLUMN IF EXISTS "cuenta_id";--> statement-breakpoint
ALTER TABLE "ingresos" DROP COLUMN IF EXISTS "cuenta_id";--> statement-breakpoint

-- ── Eliminar tablas de módulos descartados (orden por dependencias FK) ──
DROP TABLE IF EXISTS "transferencias";--> statement-breakpoint
DROP TABLE IF EXISTS "cuentas";--> statement-breakpoint
DROP TABLE IF EXISTS "suscripciones_servicios";--> statement-breakpoint
DROP TABLE IF EXISTS "etiquetas_asign";--> statement-breakpoint
DROP TABLE IF EXISTS "etiquetas";--> statement-breakpoint
DROP TABLE IF EXISTS "meta_movimientos";--> statement-breakpoint
DROP TABLE IF EXISTS "metas";--> statement-breakpoint
DROP TABLE IF EXISTS "suscripciones_push";--> statement-breakpoint
DROP TABLE IF EXISTS "invitaciones_espacio";--> statement-breakpoint

-- ── Eliminar enums huérfanos ──
DROP TYPE IF EXISTS "periodicidad_suscripcion";--> statement-breakpoint
DROP TYPE IF EXISTS "tipo_meta";--> statement-breakpoint

-- ── Control de acceso al sistema (superadmin + allowlist) ──
DO $$ BEGIN
  CREATE TYPE "rol_usuario" AS ENUM ('superadmin', 'usuario');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "rol" "rol_usuario" DEFAULT 'usuario' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "permitido" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Conserva el acceso de los usuarios YA existentes al activar el control de
-- acceso (no bloquea datos reales). Acotado por fecha => idempotente ante
-- reejecuciones del runner y sin re-otorgar acceso a usuarios nuevos.
UPDATE "usuarios" SET "permitido" = true WHERE "created_at" < '2026-05-26';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "accesos_permitidos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "agregado_por" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accesos_permitidos_email_uniq" ON "accesos_permitidos" ("email");--> statement-breakpoint

-- ── Control total de familia: quién registró el movimiento (≠ dueño) ──
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "registrado_por_id" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN IF NOT EXISTS "registrado_por_id" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL;
