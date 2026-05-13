// Health check para uptime monitoring y CI smoke tests.
// Ver §6.5 de planifica.md.
//
// Devuelve 200 con `status: "ok"` si DB responde a SELECT 1.
// 503 si la DB no responde para que el load balancer pueda excluir
// la instancia. No requiere autenticación.
//
// En producción omitimos `version` y `uptime`: facilitan fingerprinting
// de la build/deploy (atacante sabe cuándo reiniciaste o qué versión
// corres). El uptime monitor sólo necesita el código HTTP.

import { sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { logger } from '../utils/logger.js'

export default defineEventHandler(async (event) => {
  const isProd = process.env.NODE_ENV === 'production'
  const checks = { db: 'unknown' }
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

  const body = { status: 'ok', checks }
  if (!isProd) {
    body.uptime = process.uptime()
    body.ts = new Date().toISOString()
    body.version = process.env.APP_VERSION || 'unknown'
    body.latencyMs = Date.now() - start
  }
  return body
})
