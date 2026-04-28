// Log estructurado de requests a /api con duración.
// Ver §6.5 de planifica.md.
//
// Solo en producción para no contaminar el dev. Usa el logger seguro
// que ya redacta tokens, api keys, etc. No loguea body por privacidad.

import { logger } from '../utils/logger.js'

export default defineEventHandler((event) => {
  if (process.env.NODE_ENV !== 'production') return
  const url = event.node.req.url || ''
  if (!url.startsWith('/api/')) return

  const start = Date.now()
  const method = event.node.req.method

  event.node.res.on('finish', () => {
    const status = event.node.res.statusCode
    const duration = Date.now() - start
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    logger[level]('http', {
      method,
      path: url.split('?')[0],
      status,
      durationMs: duration,
    })
  })
})
