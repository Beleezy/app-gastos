-- Mini-módulo Ahorros: medios_ahorro, ahorros, metas_ahorro

CREATE TABLE IF NOT EXISTS "medios_ahorro" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "nombre" varchar(80) NOT NULL,
  "tipo" varchar(40),
  "icono" varchar(16),
  "color" varchar(16),
  "orden" integer DEFAULT 0 NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "medios_ahorro_usuario_idx"
  ON "medios_ahorro" ("usuario_id");

CREATE TABLE IF NOT EXISTS "ahorros" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "medio_ahorro_id" uuid REFERENCES "medios_ahorro"("id") ON DELETE SET NULL,
  "gasto_planificado_id" uuid REFERENCES "gastos_planificados"("id") ON DELETE SET NULL,
  "gasto_id" uuid REFERENCES "gastos"("id") ON DELETE SET NULL,
  "concepto" varchar(200),
  "monto" numeric(12, 2) NOT NULL,
  "fecha" date NOT NULL,
  "mes" integer NOT NULL,
  "anio" integer NOT NULL,
  "notas" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ahorros_usuario_mes_idx"
  ON "ahorros" ("usuario_id", "anio", "mes");

CREATE INDEX IF NOT EXISTS "ahorros_medio_idx"
  ON "ahorros" ("medio_ahorro_id");

CREATE TABLE IF NOT EXISTS "metas_ahorro" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "tipo" varchar(16) NOT NULL,
  "mes" integer,
  "anio" integer,
  "monto_objetivo" numeric(12, 2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "metas_ahorro_mensual_uniq"
  ON "metas_ahorro" ("usuario_id", "tipo", "mes", "anio");
