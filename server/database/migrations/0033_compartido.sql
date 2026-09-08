-- Migración 0033: módulo Compartido — visibilidad de gastos entre usuarios.
--
-- Permite que un usuario (emisor) le dé a otro (receptor) visibilidad sobre
-- parte de sus gastos, para que este pueda advertirle sobre el ritmo de
-- consumo antes de que se pase del presupuesto. NO es gasto compartido ni
-- división de cuentas — eso es el módulo Deudas.
--
-- Decisiones de diseño que explican este schema:
--
--  1. SIN ESPEJADO. Ambos usuarios viven en la misma BD, así que la vista
--     compartida LEE los gastos del emisor con un permiso verificado en
--     servidor. Espejar filas (como hace Deudas con vinculo_deuda_id)
--     traería duplicación, drift, líos con la papelera y borrados en
--     cascada al revocar. El botón "Sincronizar" de la UI es un refetch.
--
--  2. CONEXIÓN UNIDIRECCIONAL A→B ("B ve los gastos de A"). Visibilidad
--     mutua = dos filas. Evita el caso ambiguo de "acepté que me vea pero
--     yo no quiero mostrar lo mío".
--
--  3. gastos.visibilidad con 3 estados resuelve las excepciones por gasto
--     sin tabla puente: 'auto' sigue las reglas de categoría de cada
--     conexión, 'compartido' fuerza visible aunque su categoría no esté
--     compartida, 'privado' oculta siempre y gana sobre todo lo demás.
--
--  4. Una conexión SIN filas en compartido_categorias solo muestra los
--     gastos marcados a mano. Ese es el "modo selección" — sin columna de
--     modo, sin combinaciones inválidas posibles.
--
--  5. REVOCAR NO BORRA: estado='revocada' conserva el historial de avisos
--     y el filtro de visibilidad ya corta el acceso. El cron de papelera
--     purga las revocadas antiguas.
--
--  6. Los eventos de sistema ("dejó de compartir Comida", "pausó") viven
--     en compartido_avisos con tipo='sistema' y autor_id NULL. Cero tablas
--     extra y el receptor nunca ve desaparecer una categoría en silencio.
--
-- Estilo idempotente (IF NOT EXISTS / DO$$) para scripts/apply-migrations.mjs.

-- ── Enums ──
DO $$ BEGIN
  CREATE TYPE "visibilidad_gasto" AS ENUM ('auto', 'compartido', 'privado');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "estado_conexion_compartido" AS ENUM ('pendiente', 'aceptada', 'rechazada', 'revocada', 'expirada');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "nivel_detalle_compartido" AS ENUM ('resumen', 'detalle');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "tipo_aviso_compartido" AS ENUM ('aviso', 'pregunta', 'ok', 'sistema');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- ── Tabla: compartido_conexiones — la invitación Y el vínculo ──
-- Una sola tabla para ambas cosas: una invitación aceptada ES la conexión.
-- Separarlas (como solicitudes_vinculo vs personas_entidades) duplicaría el
-- estado y obligaría a mantener dos ciclos de vida en sincronía.
CREATE TABLE IF NOT EXISTS "compartido_conexiones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  -- Quien comparte sus gastos.
  "emisor_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  -- Siempre en minúsculas (ver CHECK): permite invitar a alguien que aún no
  -- tiene cuenta y resolverlo a receptor_id cuando se registre.
  "receptor_email" varchar(255) NOT NULL,
  "receptor_id" uuid REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "estado" "estado_conexion_compartido" DEFAULT 'pendiente' NOT NULL,
  -- 'resumen' = solo agregados por categoría (presupuesto, consumido, %,
  -- proyección). 'detalle' = además la lista de gastos. Default deliberado:
  -- el caso de uso ("¿en qué está gastando?") se cubre con agregados.
  "nivel_detalle" "nivel_detalle_compartido" DEFAULT 'resumen' NOT NULL,
  -- Si el receptor ve los gastos marcados con visibilidad='compartido'.
  "incluir_marcados" boolean DEFAULT true NOT NULL,
  -- Congela la visibilidad sin romper el vínculo (evita re-invitar).
  "pausada" boolean DEFAULT false NOT NULL,
  "mensaje" text,
  -- Última vez que el receptor abrió la vista: base de "qué hay de nuevo".
  "visto_hasta" timestamp,
  "aceptada_en" timestamp,
  "revocada_en" timestamp,
  "revocada_por" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  -- El email se normaliza en el servidor; el CHECK evita que un camino
  -- futuro inserte 'Ana@X.com' y rompa el índice único de abajo.
  CONSTRAINT "compartido_conexiones_email_lower_chk"
    CHECK ("receptor_email" = lower("receptor_email")),
  CONSTRAINT "compartido_conexiones_no_self_chk"
    CHECK ("receptor_id" IS NULL OR "receptor_id" <> "emisor_id")
);--> statement-breakpoint

-- Una sola conexión viva por (emisor, email). Las rechazadas/revocadas/
-- expiradas quedan fuera del índice, así que se puede volver a invitar.
CREATE UNIQUE INDEX IF NOT EXISTS "compartido_conexiones_activa_uq"
  ON "compartido_conexiones" ("emisor_id", "receptor_email")
  WHERE "estado" IN ('pendiente', 'aceptada');--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "compartido_conexiones_emisor_idx"
  ON "compartido_conexiones" ("emisor_id", "estado");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "compartido_conexiones_receptor_idx"
  ON "compartido_conexiones" ("receptor_id", "estado");--> statement-breakpoint

-- Invitaciones pendientes para un email que todavía no tiene cuenta.
CREATE INDEX IF NOT EXISTS "compartido_conexiones_email_idx"
  ON "compartido_conexiones" ("receptor_email", "estado");--> statement-breakpoint

-- ── Tabla: compartido_categorias — qué ve, por conexión ──
CREATE TABLE IF NOT EXISTS "compartido_categorias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conexion_id" uuid NOT NULL REFERENCES "compartido_conexiones"("id") ON DELETE CASCADE,
  "categoria_id" uuid NOT NULL REFERENCES "categorias"("id") ON DELETE CASCADE,
  -- Umbral del OBSERVADOR, independiente del presupuestos_categoria.
  -- alerta_umbral que se puso el emisor. Admite >100 para "avísame solo si
  -- se pasa del presupuesto".
  "umbral_aviso" integer DEFAULT 75 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "compartido_categorias_umbral_chk"
    CHECK ("umbral_aviso" BETWEEN 1 AND 200)
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "compartido_categorias_conexion_categoria_uq"
  ON "compartido_categorias" ("conexion_id", "categoria_id");--> statement-breakpoint

-- ── Tabla: compartido_avisos — el canal "ojo con esto" + eventos ──
CREATE TABLE IF NOT EXISTS "compartido_avisos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conexion_id" uuid NOT NULL REFERENCES "compartido_conexiones"("id") ON DELETE CASCADE,
  -- NULL solo para tipo='sistema'. El destinatario se deriva: es la otra
  -- parte de la conexión, así que no hace falta persistirlo.
  "autor_id" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "tipo" "tipo_aviso_compartido" DEFAULT 'aviso' NOT NULL,
  -- Un aviso apunta a una categoría O a un gasto, nunca a ambos.
  "categoria_id" uuid REFERENCES "categorias"("id") ON DELETE SET NULL,
  "gasto_id" uuid REFERENCES "gastos"("id") ON DELETE SET NULL,
  "mensaje" text NOT NULL,
  "leido_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "compartido_avisos_autor_chk"
    CHECK ("tipo" = 'sistema' OR "autor_id" IS NOT NULL),
  CONSTRAINT "compartido_avisos_objetivo_chk"
    CHECK ("categoria_id" IS NULL OR "gasto_id" IS NULL)
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "compartido_avisos_conexion_idx"
  ON "compartido_avisos" ("conexion_id", "created_at" DESC);--> statement-breakpoint

-- Badge de no leídos: parcial, porque los leídos no se consultan por este
-- camino y son la mayoría con el tiempo.
CREATE INDEX IF NOT EXISTS "compartido_avisos_no_leidos_idx"
  ON "compartido_avisos" ("conexion_id")
  WHERE "leido_at" IS NULL;--> statement-breakpoint

-- ── gastos.visibilidad ──
-- NOT NULL con default: en PG11+ es metadata-only, no reescribe la tabla.
ALTER TABLE "gastos"
  ADD COLUMN IF NOT EXISTS "visibilidad" "visibilidad_gasto" DEFAULT 'auto' NOT NULL;--> statement-breakpoint

-- Los gastos marcados a mano son una minoría diminuta frente a los 'auto',
-- así que el índice parcial pesa poco y resuelve la rama "OR
-- visibilidad='compartido'" de la query de la vista compartida. El resto de
-- índices se decide con EXPLAIN sobre la query real (bloque 3).
CREATE INDEX IF NOT EXISTS "gastos_visibilidad_marcados_idx"
  ON "gastos" ("usuario_id", "visibilidad")
  WHERE "visibilidad" <> 'auto';
