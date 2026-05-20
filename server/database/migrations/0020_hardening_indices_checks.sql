-- Wave 1 — Hardening de datos.
--
-- Añade índices faltantes (espejado de vínculos, auditoría por fecha) y
-- constraints CHECK para garantizar invariantes monetarias a nivel de BD,
-- complementando la validación Zod en la capa de aplicación.
--
-- Todo es IF NOT EXISTS / NOT VALID + VALIDATE para que la migración sea
-- idempotente y no bloquee tablas grandes.
--
-- NOTA producción: si alguna tabla supera el millón de filas, aplicar la
-- versión CONCURRENTLY de los CREATE INDEX desde psql en vez de esta
-- migración (CONCURRENTLY no puede correr dentro de una transacción).

-- ── Índices ──

-- Listados de auditoría ordenados por fecha (UI muestra últimos eventos).
CREATE INDEX IF NOT EXISTS "auditoria_vinculos_created_at_idx"
  ON "auditoria_vinculos" ("created_at" DESC);

-- Lookup de espejado: dada una deuda compartida con otro usuario, el
-- backend resuelve el otro lado por vinculo_deuda_id.
CREATE INDEX IF NOT EXISTS "deudas_vinculo_deuda_idx"
  ON "deudas" ("vinculo_deuda_id")
  WHERE "vinculo_deuda_id" IS NOT NULL;

-- Idem para pagos espejados.
CREATE INDEX IF NOT EXISTS "pagos_deuda_vinculo_pago_idx"
  ON "pagos_deuda" ("vinculo_pago_id")
  WHERE "vinculo_pago_id" IS NOT NULL;

-- Listado de auditoría por par usuario+fecha (vista del módulo Vínculos).
CREATE INDEX IF NOT EXISTS "auditoria_vinculos_usuario_created_idx"
  ON "auditoria_vinculos" ("usuario_id", "created_at" DESC);

-- ── CHECK constraints ──
-- Defensa en profundidad: bloqueamos montos no positivos a nivel BD. Si
-- alguien evade Zod (consulta directa, script de admin, bug), la BD aún
-- mantiene la invariante.
--
-- Usamos NOT VALID + VALIDATE en dos pasos por si hubiera filas legacy
-- con monto <= 0 (la VALIDATE explica qué fila viola sin lockear escritura).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gastos_monto_positivo'
  ) THEN
    ALTER TABLE "gastos"
      ADD CONSTRAINT "gastos_monto_positivo"
      CHECK ("monto" > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pagos_deuda_monto_positivo'
  ) THEN
    ALTER TABLE "pagos_deuda"
      ADD CONSTRAINT "pagos_deuda_monto_positivo"
      CHECK ("monto_pagado" > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deudas_montos_positivos'
  ) THEN
    ALTER TABLE "deudas"
      ADD CONSTRAINT "deudas_montos_positivos"
      CHECK ("monto_original" > 0 AND "monto_pendiente" >= 0
             AND "monto_pendiente" <= "monto_original") NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ahorros_monto_positivo'
  ) THEN
    ALTER TABLE "ahorros"
      ADD CONSTRAINT "ahorros_monto_positivo"
      CHECK ("monto" > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gastos_planificados_monto_positivo'
  ) THEN
    ALTER TABLE "gastos_planificados"
      ADD CONSTRAINT "gastos_planificados_monto_positivo"
      CHECK ("monto_estimado" > 0) NOT VALID;
  END IF;
END $$;

-- Validar las constraints ahora. Si una fila legacy las viola, este
-- comando falla con un mensaje claro; en ese caso, corregir los datos
-- antes de re-aplicar la migración.
ALTER TABLE "gastos" VALIDATE CONSTRAINT "gastos_monto_positivo";
ALTER TABLE "pagos_deuda" VALIDATE CONSTRAINT "pagos_deuda_monto_positivo";
ALTER TABLE "deudas" VALIDATE CONSTRAINT "deudas_montos_positivos";
ALTER TABLE "ahorros" VALIDATE CONSTRAINT "ahorros_monto_positivo";
ALTER TABLE "gastos_planificados" VALIDATE CONSTRAINT "gastos_planificados_monto_positivo";
