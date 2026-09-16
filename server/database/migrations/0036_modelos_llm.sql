-- Catálogo de modelos de IA (Gemini) mantenido en la base de datos.
--
-- Hasta ahora la lista de modelos vivía en la variable de entorno
-- GEMINI_MODEL ("modelo1;modelo2"): cambiarla exigía un redeploy, un modelo
-- retirado por Google seguía en la cadena fallando hasta agotar sus
-- reintentos en CADA petición, y uno nuevo nunca se adoptaba solo.
--
-- La tabla la alimenta el descubrimiento (ListModels de la API de Google,
-- endpoint superadmin y cron semanal) y la mantiene el superadmin. Los dos
-- nombres de la configuración por defecto se siembran como origen 'entorno'
-- para que la app siga funcionando igual hasta el primer descubrimiento.
--
-- Aditiva e idempotente.

CREATE TABLE IF NOT EXISTS "modelos_llm" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar(120) NOT NULL,
  "proveedor" varchar(30) NOT NULL DEFAULT 'gemini',
  "activo" boolean NOT NULL DEFAULT true,
  "prioridad" integer NOT NULL DEFAULT 500,
  -- 'entorno' (sembrado desde GEMINI_MODEL), 'descubierto' (ListModels) o
  -- 'manual' (lo añadió el superadmin).
  "origen" varchar(20) NOT NULL DEFAULT 'manual',
  "soporta_imagen" boolean NOT NULL DEFAULT true,
  "version" varchar(60),
  "descripcion" text,
  "fallos_consecutivos" integer NOT NULL DEFAULT 0,
  -- true cuando lo apagó el propio sistema por fallos seguidos (no el
  -- superadmin): el descubrimiento puede volver a encenderlo.
  "desactivado_auto" boolean NOT NULL DEFAULT false,
  "ultimo_error" text,
  "ultimo_fallo_at" timestamp,
  "ultimo_exito_at" timestamp,
  "descubierto_at" timestamp,
  "visto_en_google_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "modelos_llm_nombre_uq" UNIQUE ("nombre"),
  CONSTRAINT "modelos_llm_prioridad_chk" CHECK ("prioridad" BETWEEN 0 AND 1000),
  CONSTRAINT "modelos_llm_origen_chk" CHECK ("origen" IN ('entorno', 'descubierto', 'manual'))
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "modelos_llm_activos_idx" ON "modelos_llm" ("activo", "prioridad");--> statement-breakpoint

INSERT INTO "modelos_llm" ("nombre", "origen", "prioridad", "descripcion")
VALUES
  ('gemini-3.1-flash-lite-preview', 'entorno', 320, 'Sembrado desde la configuración por defecto'),
  ('gemini-2.5-flash', 'entorno', 755, 'Sembrado desde la configuración por defecto')
ON CONFLICT ("nombre") DO NOTHING;
