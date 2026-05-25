-- Migración 0029: perfiles gestionados (familia) + retiro de espacios compartidos.
--
-- Un "perfil gestionado" es una fila de `usuarios` sin login, administrada por
-- el usuario real indicado en `gestionado_por_id`. Reemplaza el modelo de
-- espacios compartidos (que asumía usuarios reales como miembros).
--
-- Estilo idempotente compatible con scripts/apply-migrations.mjs.

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "gestionado_por_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usuarios_gestionado_idx" ON "usuarios" ("gestionado_por_id");--> statement-breakpoint

DROP INDEX IF EXISTS "gastos_espacio_fecha_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ingresos_espacio_fecha_idx";--> statement-breakpoint
ALTER TABLE "gastos" DROP COLUMN IF EXISTS "espacio_id";--> statement-breakpoint
ALTER TABLE "ingresos" DROP COLUMN IF EXISTS "espacio_id";--> statement-breakpoint

DROP TABLE IF EXISTS "miembros_espacio";--> statement-breakpoint
DROP TABLE IF EXISTS "espacios_compartidos";
