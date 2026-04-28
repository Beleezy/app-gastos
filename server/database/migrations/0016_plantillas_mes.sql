-- Plantillas reutilizables de plan mensual.
-- Ver §5.A punto 4 de planifica.md.

CREATE TABLE IF NOT EXISTS "plantillas_mes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "nombre" varchar(150) NOT NULL,
  "monto_presupuesto" numeric(12, 2),
  "gastos_json" text NOT NULL DEFAULT '[]',
  "notas" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "plantillas_mes_usuario_idx"
  ON "plantillas_mes" ("usuario_id");
