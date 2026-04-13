CREATE TABLE IF NOT EXISTS "gastos_futuros" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL,
  "categoria_id" uuid NOT NULL,
  "tipo_gasto" varchar(160) NOT NULL,
  "descripcion" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "gastos_futuros_usuario_id_usuarios_id_fk"
    FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "gastos_futuros_categoria_id_categorias_id_fk"
    FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "gastos_futuros_detalles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gasto_futuro_id" uuid NOT NULL,
  "nombre" varchar(160) NOT NULL,
  "notas" text,
  "orden" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "gastos_futuros_detalles_gasto_futuro_id_gastos_futuros_id_fk"
    FOREIGN KEY ("gasto_futuro_id") REFERENCES "public"."gastos_futuros"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "gastos_futuros_opciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "detalle_id" uuid NOT NULL,
  "nombre" varchar(200) NOT NULL,
  "referencia_url" text,
  "imagen_url" text,
  "precio_minimo" numeric(12, 2),
  "precio_maximo" numeric(12, 2),
  "precio_promedio" numeric(12, 2),
  "notas" text,
  "orden" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "gastos_futuros_opciones_detalle_id_gastos_futuros_detalles_id_fk"
    FOREIGN KEY ("detalle_id") REFERENCES "public"."gastos_futuros_detalles"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "gastos_futuros_usuario_idx"
  ON "gastos_futuros" ("usuario_id");

CREATE INDEX IF NOT EXISTS "gastos_futuros_usuario_categoria_idx"
  ON "gastos_futuros" ("usuario_id", "categoria_id");

CREATE INDEX IF NOT EXISTS "gastos_futuros_detalles_gasto_idx"
  ON "gastos_futuros_detalles" ("gasto_futuro_id", "orden");

CREATE INDEX IF NOT EXISTS "gastos_futuros_opciones_detalle_idx"
  ON "gastos_futuros_opciones" ("detalle_id", "orden");
