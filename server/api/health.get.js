// Health check para uptime monitoring y CI smoke tests.
// Ver §6.5 de planifica.md.
//
// Devuelve 200 con `status: "ok"` si DB responde a SELECT 1.
// 503 si la DB no responde para que el load balancer pueda excluir
// la instancia. No requiere autenticación.

import { sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { logger } from '../utils/logger.js'

export default defineEventHandler(async (event) => {
  const checks = { db: 'unknown' }
  const start = Date.now()

  try {
    await db.execute(sql`SELECT 1`)
    checks.db = 'ok'
  } catch (e) {
    checks.db = 'error'
    logger.error('Health check DB falló', { error: e })
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      uptime: process.uptime(),
      ts: new Date().toISOString(),
      checks,
      latencyMs: Date.now() - start,
    }
  }

  return {
    status: 'ok',
    uptime: process.uptime(),
    ts: new Date().toISOString(),
    version: process.env.APP_VERSION || 'unknown',
    checks,
    latencyMs: Date.now() - start,
  }
})
