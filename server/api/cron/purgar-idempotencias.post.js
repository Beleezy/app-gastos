// Endpoint cron: borra reservas de idempotencia ya expiradas
// (tabla idempotency_keys, migración 0034).
//
// Hace falta un job porque el TTL se evalúa al LEER una clave, y una
// clave que nunca se reintenta —el caso normal— no se lee nunca: sin
// purga la tabla solo crece. Mismo esquema de auth que el resto de crons
// (X-Cron-Secret); lo dispara .github/workflows/mantenimiento.yml.

import { purgarIdempotenciasExpiradas } from '../../utils/idempotency.js'
import { logger } from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  const got = getRequestHeader(event, 'x-cron-secret')
  if (!secret || !got || secret !== got) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const purged = await purgarIdempotenciasExpiradas()
  logger.info('idempotency_keys purga ejecutada', { purged })
  return { purged }
})
