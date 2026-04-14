ALTER TABLE "gastos_futuros"
  ADD COLUMN IF NOT EXISTS "prioridad" integer DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS "gastos_futuros_usuario_prioridad_idx"
  ON "gastos_futuros" ("usuario_id", "prioridad");
