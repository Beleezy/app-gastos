-- Wave 3 — Módulo de ingresos.
--
-- Tabla simple, espejo conceptual de `gastos` pero sin FK a categorías
-- (las categorías de gasto no aplican a sueldos/freelance). El campo
-- `origen` es libre con valores guía: salario | freelance | inversion |
-- otro. No se hace enum para permitir personalizaciones futuras sin
-- migración.

CREATE TABLE IF NOT EXISTS "ingresos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "concepto" varchar(255) NOT NULL,
  "monto" decimal(12, 2) NOT NULL,
  "fecha" date NOT NULL,
  "origen" varchar(60),
  "es_recurrente" boolean NOT NULL DEFAULT false,
  "recurrente_grupo_id" uuid,
  "metodo_registro" "metodo_registro" NOT NULL DEFAULT 'manual',
  "notas" text,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ingresos_usuario_fecha_idx"
  ON "ingresos" ("usuario_id", "fecha" DESC);

CREATE INDEX IF NOT EXISTS "ingresos_usuario_origen_idx"
  ON "ingresos" ("usuario_id", "origen");

CREATE INDEX IF NOT EXISTS "ingresos_usuario_deleted_idx"
  ON "ingresos" ("usuario_id", "deleted_at");

-- Invariante: monto > 0 (un ingreso negativo es un gasto).
ALTER TABLE "ingresos"
  ADD CONSTRAINT "ingresos_monto_positivo" CHECK ("monto" > 0);
