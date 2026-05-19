-- Índices de optimización integral. Refuerzan filtros y joins que aparecen
-- en endpoints de lectura críticos (deudas, categorías, ahorros, personas).
-- Todos son CREATE INDEX IF NOT EXISTS para idempotencia.
--
-- NOTA producción: si alguna tabla es grande (>1M filas), aplicar
-- manualmente la versión CONCURRENTLY desde psql en vez de esta migración,
-- ya que CONCURRENTLY no puede ejecutarse dentro de una transacción.

-- categorias: filtrado por usuario en cada arranque de la app.
CREATE INDEX IF NOT EXISTS "categorias_usuario_idx"
  ON "categorias" ("usuario_id");
CREATE INDEX IF NOT EXISTS "categorias_usuario_predef_idx"
  ON "categorias" ("usuario_id", "es_predefinida");

-- planes_mensuales: filtrar por usuario sin mes/año (búsqueda inicial).
CREATE INDEX IF NOT EXISTS "planes_mensuales_usuario_idx"
  ON "planes_mensuales" ("usuario_id");

-- gastos_planificados: joins inversos desde categorias.
CREATE INDEX IF NOT EXISTS "gastos_planificados_categoria_idx"
  ON "gastos_planificados" ("categoria_id");

-- personas_entidades: orden por updatedAt y búsqueda por usuario vinculado.
CREATE INDEX IF NOT EXISTS "personas_entidades_usuario_updated_idx"
  ON "personas_entidades" ("usuario_id", "updated_at");
CREATE INDEX IF NOT EXISTS "personas_entidades_vinculado_idx"
  ON "personas_entidades" ("vinculado_usuario_id");

-- deudas: listados por estado y orden por updatedAt.
CREATE INDEX IF NOT EXISTS "deudas_usuario_estado_idx"
  ON "deudas" ("usuario_id", "estado");
CREATE INDEX IF NOT EXISTS "deudas_usuario_updated_idx"
  ON "deudas" ("usuario_id", "updated_at");

-- ahorros: orden por fecha sin filtrar por mes (listado global).
CREATE INDEX IF NOT EXISTS "ahorros_usuario_fecha_idx"
  ON "ahorros" ("usuario_id", "fecha");

-- solicitudes_vinculo: pendientes para un destinatario específico.
CREATE INDEX IF NOT EXISTS "solicitudes_vinculo_destinatario_estado_idx"
  ON "solicitudes_vinculo" ("destinatario_email", "estado");
