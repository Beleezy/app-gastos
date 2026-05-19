-- Wave 5 — Modo familiar / espacios compartidos.
--
-- Permite que varios usuarios compartan un "wallet" con gastos e
-- ingresos en común. La columna `espacio_id` en gastos/ingresos es
-- OPCIONAL: NULL = movimiento personal, valor = compartido.
--
-- Roles:
--   dueno   → puede borrar el espacio y gestionar miembros
--   editor  → registra/edita movimientos
--   lector  → solo lectura
--
-- Las invitaciones reusan el enum estado_solicitud_vinculo para no
-- multiplicar enums. El email del destinatario se almacena tal cual; al
-- aceptar (POST /api/familia/invitaciones/:id/aceptar) se resuelve a un
-- usuario_id existente y se crea la fila en miembros_espacio.

CREATE TABLE IF NOT EXISTS "espacios_compartidos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dueno_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "nombre" varchar(100) NOT NULL,
  "descripcion" text,
  "icono" varchar(16),
  "color" varchar(16),
  "archivado" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "espacios_dueno_idx"
  ON "espacios_compartidos" ("dueno_id");

CREATE TABLE IF NOT EXISTS "miembros_espacio" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "espacio_id" uuid NOT NULL REFERENCES "espacios_compartidos"("id") ON DELETE CASCADE,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "rol" varchar(20) NOT NULL DEFAULT 'editor',
  "invitado_por_id" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "aceptado_en" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "miembros_espacio_rol_chk" CHECK ("rol" IN ('dueno', 'editor', 'lector'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "miembros_espacio_unico"
  ON "miembros_espacio" ("espacio_id", "usuario_id");

CREATE INDEX IF NOT EXISTS "miembros_espacio_usuario_idx"
  ON "miembros_espacio" ("usuario_id");

CREATE TABLE IF NOT EXISTS "invitaciones_espacio" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "espacio_id" uuid NOT NULL REFERENCES "espacios_compartidos"("id") ON DELETE CASCADE,
  "remitente_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "destinatario_email" varchar(255) NOT NULL,
  "destinatario_id" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "rol" varchar(20) NOT NULL DEFAULT 'editor',
  "estado" "estado_solicitud_vinculo" NOT NULL DEFAULT 'pendiente',
  "mensaje" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "invitaciones_espacio_rol_chk" CHECK ("rol" IN ('editor', 'lector'))
);

CREATE INDEX IF NOT EXISTS "invitaciones_espacio_destinatario_idx"
  ON "invitaciones_espacio" ("destinatario_email", "estado");
CREATE INDEX IF NOT EXISTS "invitaciones_espacio_espacio_idx"
  ON "invitaciones_espacio" ("espacio_id");

-- Añadir espacio_id opcional a gastos e ingresos.
ALTER TABLE "gastos" ADD COLUMN IF NOT EXISTS "espacio_id" uuid;
ALTER TABLE "ingresos" ADD COLUMN IF NOT EXISTS "espacio_id" uuid;

ALTER TABLE "gastos"
  ADD CONSTRAINT "gastos_espacio_fk"
  FOREIGN KEY ("espacio_id") REFERENCES "espacios_compartidos"("id") ON DELETE SET NULL
  NOT VALID;
ALTER TABLE "gastos" VALIDATE CONSTRAINT "gastos_espacio_fk";

ALTER TABLE "ingresos"
  ADD CONSTRAINT "ingresos_espacio_fk"
  FOREIGN KEY ("espacio_id") REFERENCES "espacios_compartidos"("id") ON DELETE SET NULL
  NOT VALID;
ALTER TABLE "ingresos" VALIDATE CONSTRAINT "ingresos_espacio_fk";

CREATE INDEX IF NOT EXISTS "gastos_espacio_fecha_idx"
  ON "gastos" ("espacio_id", "fecha" DESC)
  WHERE "espacio_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "ingresos_espacio_fecha_idx"
  ON "ingresos" ("espacio_id", "fecha" DESC)
  WHERE "espacio_id" IS NOT NULL;
