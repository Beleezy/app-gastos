// Recolector de errores cliente. Pareja de composables/useErrorReporter.js.
// Ver §6.5 de planifica.md.
//
// No requiere autenticación (errores de app pueden ocurrir en pantallas
// de login/registro). Se aplica rate limit por IP y se filtran tamaños
// excesivos. Cada error se logea con el logger seguro que ya redacta
// patrones sensibles.

import { z } from 'zod'
import { rateLimit } from '../utils/rateLimit.js'
import { validateBody } from '../utils/validate.js'
import { logger } from '../utils/logger.js'

const errorItemSchema = z.object({
  ts: z.string().max(40).optional(),
  message: z.string().max(2000).optional(),
  name: z.string().max(200).optional(),
  stack: z.string().max(4000).optional(),
  url: z.string().max(2000).nullable().optional(),
  userAgent: z.string().max(500).nullable().optional(),
  level: z.string().max(20).optional(),
  context: z.record(z.unknown()).optional(),
})

const bodySchema = z.object({
  errors: z.array(errorItemSchema).min(1).max(20),
})

export default defineEventHandler(async (event) => {
  // Rate limit estricto por IP: 30 req/min, 200 req/hora
  rateLimit(event, { key: 'errors', limit: 30, windowMs: 60_000, scope: 'ip' })

  let body
  try {
    body = await validateBody(event, bodySchema)
  } catch (e) {
    // No queremos romper si el body es inválido — un cliente
    // problemático no debe ensuciar logs ni fallar.
    return { ok: false }
  }

  for (const err of body.errors) {
    logger.warn('client_error', {
      name: err.name || 'Error',
      message: err.message || '',
      url: err.url || null,
      level: err.level || 'error',
      context: err.context || null,
    })
  }

  setResponseStatus(event, 204)
  return null
})
