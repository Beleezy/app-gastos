-- Migración 0028: modelo de intenciones de registro (control de acceso).
--
-- Reemplaza la allowlist (accesos_permitidos) por una cola de solicitudes de
-- acceso que el superadmin aprueba o rechaza. Los usuarios solo quedan con
-- acceso (en `usuarios`, permitido=true) tras la aprobación.
--
-- Estilo idempotente compatible con scripts/apply-migrations.mjs.

DROP TABLE IF EXISTS "accesos_permitidos";--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "estado_intencion" AS ENUM ('pendiente', 'aprobada', 'rechazada');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "intenciones_registro" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "supabase_user_id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "nombre" varchar(255),
  "estado" "estado_intencion" DEFAULT 'pendiente' NOT NULL,
  "decidido_por" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "decidido_en" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "intenciones_registro_supabase_user_uniq" ON "intenciones_registro" ("supabase_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intenciones_registro_estado_idx" ON "intenciones_registro" ("estado");
