-- Tabla de caché de respuestas del LLM por hash de input.
--
-- Objetivo: reducir costo y latencia cuando el usuario repite la misma
-- entrada (transcripción/foto idéntica). El TTL se controla a nivel
-- aplicación; la fila se mantiene hasta que expires_at < now() y un job
-- de limpieza puede borrar las expiradas.
--
-- La unicidad de (usuario_id, endpoint, modelo, input_hash) garantiza
-- aislamiento entre usuarios y entre endpoints/modelos: una misma frase
-- puede tener respuestas distintas según las categorías o personas del
-- usuario, y según el modelo que las procese.

CREATE TABLE IF NOT EXISTS "llm_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "endpoint" varchar(100) NOT NULL,
  "modelo" varchar(100) NOT NULL,
  "input_hash" varchar(64) NOT NULL,
  "response_json" text NOT NULL,
  "hits" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "llm_cache_lookup_uniq"
  ON "llm_cache" ("usuario_id", "endpoint", "modelo", "input_hash");

CREATE INDEX IF NOT EXISTS "llm_cache_expires_idx"
  ON "llm_cache" ("expires_at");
