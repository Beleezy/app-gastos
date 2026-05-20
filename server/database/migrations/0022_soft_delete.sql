-- Wave 2 — Soft delete en entidades borrables por el usuario.
--
-- Añade columna deleted_at (timestamp NULL) a las tablas que el usuario
-- puede eliminar y querría recuperar desde la papelera. El borrado pasa
-- de DELETE físico a UPDATE deleted_at = now(). Todas las consultas
-- existentes deben filtrar deleted_at IS NULL.
--
-- Tablas con soft delete: gastos, deudas, pagos_deuda.
-- (gastos_planificados se mantiene con DELETE físico porque su ciclo
-- es mensual y la papelera no aporta — se regeneran con duplicar plan.)
--
-- Política de purgado: cron que borre filas con deleted_at < now() - 30
-- días. Implementado en /api/cron/purgar-papelera.

ALTER TABLE "gastos"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

ALTER TABLE "deudas"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

ALTER TABLE "pagos_deuda"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- Índices parciales: optimizan tanto los listados (deleted_at IS NULL,
-- 99%+ de las filas) como las consultas a la papelera.
CREATE INDEX IF NOT EXISTS "gastos_usuario_deleted_idx"
  ON "gastos" ("usuario_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "deudas_usuario_deleted_idx"
  ON "deudas" ("usuario_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "pagos_deuda_deleted_idx"
  ON "pagos_deuda" ("deleted_at")
  WHERE "deleted_at" IS NOT NULL;

-- El unique constraint en gastos.gasto_planificado_id puede causar
-- conflicto si se borra y recrea un gasto vinculado. Hacerlo parcial:
-- solo aplicar la unicidad a gastos NO eliminados.
DROP INDEX IF EXISTS "gastos_planificado_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "gastos_planificado_unique"
  ON "gastos" ("gasto_planificado_id")
  WHERE "gasto_planificado_id" IS NOT NULL AND "deleted_at" IS NULL;
