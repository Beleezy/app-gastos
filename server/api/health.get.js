// Health check para uptime monitoring y CI smoke tests.
// Ver §6.5 de planifica.md y docs/plan-mejoras-2026-07.md §1.1.
//
// Devuelve 200 con `status: "ok"` si DB responde a SELECT 1 y el schema
// no tiene drift (columnas centinela presentes). 503 si la DB no responde
// o falta una centinela, para que el uptime monitor alerte — el incidente
// del hotfix 2bb83a7 (columna sin migrar en producción) se habría
// detectado aquí en el primer ping post-deploy. No requiere autenticación.
//
// En producción omitimos `version` y `uptime`: facilitan fingerprinting
// de la build/deploy (atacante sabe cuándo reiniciaste o qué versión
// corres). El uptime monitor sólo necesita el código HTTP.

import { sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { logger } from '../utils/logger.js'

// Columnas centinela: una por migración reciente de la que el código depende.
// Si falta alguna, la BD está desfasada respecto al schema de Drizzle y los
// endpoints que la referencian devolverían 500 — mejor gritar aquí.
// Mantener al día: al añadir una migración con columna nueva crítica,
// reemplazar la centinela más antigua por la nueva.
const SENTINEL_COLUMNS = [
  ['idempotency_keys', 'clave'], // 0034_idempotency_keys
  ['gastos', 'visibilidad'], // 0033_compartido
  ['personas_entidades', 'deleted_at'], // 0032_personas_soft_delete
]

// El drift de schema solo cambia cuando corre una migración, es decir
// nunca dentro de la vida de una instancia. Consultarlo en cada ping es
// gasto puro, y este endpoint es el único de /api/* exento del rate limit
// global (a propósito: si se throttlea, la métrica de disponibilidad
// miente) — o sea, un endpoint sin auth y sin tope que hacía 2 queries por
// petición. Cacheando el resultado, martillearlo deja de martillear la BD
// sin tocar la exención, que sigue siendo lo correcto para el monitor.
const DRIFT_TTL_MS = 60 * 1000
let driftCache = null // { faltantes: string[], expiresAt: number }

export default defineEventHandler(async (event) => {
  const isProd = process.env.NODE_ENV === 'production'
  const checks = { db: 'unknown', schema: 'unknown' }
  const start = Date.now()

  try {
    await db.execute(sql`SELECT 1`)
    checks.db = 'ok'
  } catch (e) {
    checks.db = 'error'
    logger.error('Health check DB falló', { error: e })
    setResponseStatus(event, 503)
    const body = { status: 'unhealthy', checks }
    if (!isProd) {
      body.uptime = process.uptime()
      body.ts = new Date().toISOString()
      body.latencyMs = Date.now() - start
    }
    return body
  }

  try {
    let faltantes
    if (driftCache && driftCache.expiresAt > Date.now()) {
      faltantes = driftCache.faltantes
    } else {
      const pares = SENTINEL_COLUMNS.map(([t, c]) => `('${t}','${c}')`).join(',')
      const rows = await db.execute(
        sql.raw(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE (table_name, column_name) IN (${pares})
    `),
      )
      const presentes = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`))
      faltantes = SENTINEL_COLUMNS.map(([t, c]) => `${t}.${c}`).filter(
        (col) => !presentes.has(col),
      )
      driftCache = { faltantes, expiresAt: Date.now() + DRIFT_TTL_MS }
    }

    if (faltantes.length > 0) {
      checks.schema = 'drift'
      logger.error('Health check: drift de schema — columnas centinela ausentes', {
        faltantes,
      })
      setResponseStatus(event, 503)
      const body = { status: 'unhealthy', checks }
      if (!isProd) body.faltantes = faltantes
      return body
    }
    checks.schema = 'ok'
  } catch (e) {
    // information_schema no debería fallar si SELECT 1 pasó; si falla,
    // reportar como error de schema sin tumbar el resto del diagnóstico.
    checks.schema = 'error'
    logger.error('Health check: fallo consultando information_schema', { error: e })
  }

  const body = { status: 'ok', checks }
  if (!isProd) {
    body.uptime = process.uptime()
    body.ts = new Date().toISOString()
    body.version = process.env.APP_VERSION || 'unknown'
    body.latencyMs = Date.now() - start
  }
  return body
})
