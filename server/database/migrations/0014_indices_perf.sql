-- Índices de performance adicionales. Ver §2.2 de planifica.md.
-- Refuerzan filtros frecuentes que hoy hacen seq scan en tablas grandes.
-- Todos son CREATE INDEX IF NOT EXISTS para ser idempotentes.

-- Listas de planificados por mes filtrando por estado (pendiente/pagado).
CREATE INDEX IF NOT EXISTS "gastos_planificados_plan_estado_idx"
  ON "gastos_planificados" ("plan_mensual_id", "estado");

-- Historial de pagos ordenado por fecha dentro de una deuda.
CREATE INDEX IF NOT EXISTS "pagos_deuda_deuda_fecha_idx"
  ON "pagos_deuda" ("deuda_id", "fecha_pago");

-- Solicitudes de vínculo filtradas globalmente por estado.
CREATE INDEX IF NOT EXISTS "solicitudes_vinculo_estado_idx"
  ON "solicitudes_vinculo" ("estado");

-- Gastos futuros con detalles aún pendientes de decisión.
CREATE INDEX IF NOT EXISTS "gastos_futuros_detalles_pendientes_idx"
  ON "gastos_futuros_detalles" ("gasto_futuro_id", "estado_decision")
  WHERE "estado_decision" = 'pendiente';
