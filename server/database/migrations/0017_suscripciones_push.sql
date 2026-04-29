-- Suscripciones Web Push.
-- Ver §5.3 de planifica.md.

CREATE TABLE IF NOT EXISTS "suscripciones_push" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" varchar(500),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "suscripciones_push_endpoint_uniq"
  ON "suscripciones_push" ("endpoint");

CREATE INDEX IF NOT EXISTS "suscripciones_push_usuario_idx"
  ON "suscripciones_push" ("usuario_id");
