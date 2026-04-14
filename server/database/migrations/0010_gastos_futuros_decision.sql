ALTER TABLE "gastos_futuros_detalles"
  ADD COLUMN IF NOT EXISTS "estado_decision" varchar(20),
  ADD COLUMN IF NOT EXISTS "decidido_en" timestamp,
  ADD COLUMN IF NOT EXISTS "gasto_id" uuid REFERENCES "gastos"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "gasto_planificado_id" uuid REFERENCES "gastos_planificados"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "gastos_futuros_detalles_decision_idx"
  ON "gastos_futuros_detalles" ("estado_decision");
