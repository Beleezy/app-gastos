-- Tracking de consumo del LLM por usuario y mes.
-- Ver §1.9 de planifica.md.

CREATE TABLE IF NOT EXISTS "uso_llm" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "anio" integer NOT NULL,
  "mes" integer NOT NULL,
  "endpoint" varchar(100) NOT NULL,
  "total_requests" integer NOT NULL DEFAULT 0,
  "total_tokens" integer NOT NULL DEFAULT 0,
  "ultima_peticion" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uso_llm_usuario_periodo_uniq"
  ON "uso_llm" ("usuario_id", "anio", "mes", "endpoint");

CREATE INDEX IF NOT EXISTS "uso_llm_usuario_idx"
  ON "uso_llm" ("usuario_id");
