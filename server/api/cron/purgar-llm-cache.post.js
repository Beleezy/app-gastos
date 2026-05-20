// Endpoint cron: borra entradas expiradas de la tabla llm_cache.
// Recomendado correr cada 6h-24h. Mismo esquema de auth que el resto
// de crons (X-Cron-Secret).

import { purgeExpired } from '../../utils/llmCache.js'
import { logger } from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  const got = getRequestHeader(event, 'x-cron-secret')
  if (!secret || !got || secret !== got) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const purged = await purgeExpired()
  logger.info('llm_cache purga ejecutada', { purged })
  return { purged }
})
