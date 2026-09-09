-- Aparta las filas de `gastos` con monto <= 0 que detienen la cadena de
-- migraciones en 0020.
--
-- 0020_hardening_indices_checks.sql crea `gastos_monto_positivo` como NOT
-- VALID y después la VALIDATE. Ese VALIDATE falla con 23514 en producción, y
-- como el archivo corre dentro de una transacción, revierte entero: 0020 a
-- 0033 nunca se aplicaron. Producción quedó detenida en 0019 desde julio.
--
-- Es un problema de datos, no de esquema. La app nunca pudo crear estas filas:
-- el schema Zod compartido exige monto positivo (shared/schemas/common.js) y
-- los reembolsos se registran como ingresos, no como gastos negativos. Son
-- anomalías anteriores a esa validación o insertadas por fuera.
--
-- Esta migración NO decide qué significan. Las copia enteras a una tabla de
-- cuarentena —con las referencias que les apuntaban, para poder rehacerlas— y
-- las saca de `gastos`. Nada se pierde y se puede deshacer con un INSERT.
--
-- Ver qué quedó apartado:
--   SELECT * FROM gastos_montos_invalidos;
-- Devolver una fila corrigiendo el signo:
--   INSERT INTO gastos SELECT (q).* FROM (
--     SELECT q FROM gastos_montos_invalidos q WHERE q.id = '<id>'
--   ) s;  -- y luego UPDATE gastos SET monto = abs(monto) WHERE id = '<id>';
--
-- La tabla de cuarentena queda fuera de schema.js a propósito: no es una tabla
-- de la aplicación, es el registro de una limpieza puntual.

CREATE TABLE IF NOT EXISTS "gastos_montos_invalidos" (LIKE "gastos");

ALTER TABLE "gastos_montos_invalidos"
  ADD COLUMN IF NOT EXISTS "cuarentena_en" timestamptz NOT NULL DEFAULT now();

ALTER TABLE "gastos_montos_invalidos"
  ADD COLUMN IF NOT EXISTS "motivo" text NOT NULL DEFAULT '';

-- Las FK hacia gastos.id son ON DELETE SET NULL, así que el DELETE de abajo no
-- borra nada de las tablas hijas, pero sí deja el vínculo en NULL. Guardamos a
-- qué filas apuntaba cada gasto para que restaurarlo pueda rehacer el enlace.
ALTER TABLE "gastos_montos_invalidos"
  ADD COLUMN IF NOT EXISTS "referencias" jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO "gastos_montos_invalidos"
SELECT
  g.*,
  now(),
  'monto <= 0: violaba gastos_monto_positivo y detenía la cadena en 0020',
  jsonb_build_object(
    'ahorros',
    (SELECT coalesce(jsonb_agg(a."id"), '[]'::jsonb) FROM "ahorros" a WHERE a."gasto_id" = g."id"),
    'gastos_futuros_detalles',
    (SELECT coalesce(jsonb_agg(d."id"), '[]'::jsonb)
       FROM "gastos_futuros_detalles" d WHERE d."gasto_id" = g."id")
  )
FROM "gastos" g
WHERE g."monto" <= 0;

DELETE FROM "gastos" WHERE "monto" <= 0;
