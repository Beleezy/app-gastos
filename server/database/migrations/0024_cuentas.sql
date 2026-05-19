-- Wave 4 — Multi-cuenta / billetera.
--
-- Permite separar movimientos entre efectivo, débito, crédito, ahorros,
-- etc. La columna `cuenta_id` en gastos/ingresos es opcional para no
-- forzar migración de datos existentes; los movimientos sin cuenta se
-- consideran de la cuenta "predeterminada" en la UI.
--
-- Saldo NO se materializa: se calcula on-demand para evitar drift por
-- retries / soft-delete + restore. Para listas de cuentas con saldo, la
-- API hace SUM agrupando con LEFT JOIN.

CREATE TABLE IF NOT EXISTS "cuentas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "nombre" varchar(80) NOT NULL,
  "tipo" varchar(30) NOT NULL,
  "moneda" varchar(10) NOT NULL DEFAULT 'PEN',
  "saldo_inicial" decimal(12, 2) NOT NULL DEFAULT 0,
  "icono" varchar(16),
  "color" varchar(16),
  "orden" integer NOT NULL DEFAULT 0,
  "archivada" boolean NOT NULL DEFAULT false,
  "es_predeterminada" boolean NOT NULL DEFAULT false,
  "notas" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cuentas_usuario_idx" ON "cuentas" ("usuario_id");
CREATE INDEX IF NOT EXISTS "cuentas_usuario_archivada_idx"
  ON "cuentas" ("usuario_id", "archivada");

-- Solo UNA cuenta predeterminada por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS "cuentas_predeterminada_uniq"
  ON "cuentas" ("usuario_id")
  WHERE "es_predeterminada" = true;

CREATE TABLE IF NOT EXISTS "transferencias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "cuenta_origen_id" uuid NOT NULL REFERENCES "cuentas"("id") ON DELETE RESTRICT,
  "cuenta_destino_id" uuid NOT NULL REFERENCES "cuentas"("id") ON DELETE RESTRICT,
  "monto" decimal(12, 2) NOT NULL,
  "fecha" date NOT NULL,
  "concepto" varchar(200),
  "notas" text,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "transferencias_monto_positivo" CHECK ("monto" > 0),
  CONSTRAINT "transferencias_cuentas_distintas" CHECK ("cuenta_origen_id" != "cuenta_destino_id")
);

CREATE INDEX IF NOT EXISTS "transferencias_usuario_fecha_idx"
  ON "transferencias" ("usuario_id", "fecha" DESC);
CREATE INDEX IF NOT EXISTS "transferencias_origen_idx"
  ON "transferencias" ("cuenta_origen_id");
CREATE INDEX IF NOT EXISTS "transferencias_destino_idx"
  ON "transferencias" ("cuenta_destino_id");

-- Añadir cuenta_id opcional a gastos e ingresos.
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "cuenta_id" uuid;
ALTER TABLE "ingresos" ADD COLUMN IF NOT EXISTS "cuenta_id" uuid;

-- FK con ON DELETE SET NULL: si se borra la cuenta, los movimientos
-- quedan "sin cuenta" en vez de perderse. NOT VALID + VALIDATE para
-- migrar tablas grandes sin bloqueo prolongado.
ALTER TABLE "gastos"
  ADD CONSTRAINT "gastos_cuenta_fk"
  FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE SET NULL
  NOT VALID;
ALTER TABLE "gastos" VALIDATE CONSTRAINT "gastos_cuenta_fk";

ALTER TABLE "ingresos"
  ADD CONSTRAINT "ingresos_cuenta_fk"
  FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE SET NULL
  NOT VALID;
ALTER TABLE "ingresos" VALIDATE CONSTRAINT "ingresos_cuenta_fk";

CREATE INDEX IF NOT EXISTS "gastos_cuenta_idx" ON "gastos" ("cuenta_id");
CREATE INDEX IF NOT EXISTS "ingresos_cuenta_idx" ON "ingresos" ("cuenta_id");
