-- Integración con Google Calendar.
-- Ver docs/superpowers/specs/2026-05-11-google-calendar-integracion-design.md

CREATE TABLE IF NOT EXISTS "google_calendar_conexiones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "refresh_token_cifrado" text NOT NULL,
  "calendar_id" varchar(255) NOT NULL,
  "calendar_nombre" varchar(255) NOT NULL,
  "recordatorios_config" jsonb NOT NULL,
  "ultima_sync" timestamp,
  "ultimo_error" text,
  "fecha_conexion" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_calendar_conexiones_usuario_unique"
  ON "google_calendar_conexiones" ("usuario_id");

ALTER TABLE "gastos_planificados"
  ADD COLUMN IF NOT EXISTS "google_event_id" varchar(255);
