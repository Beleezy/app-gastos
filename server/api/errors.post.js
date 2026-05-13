// Recolector de errores cliente. Pareja de composables/useErrorReporter.js.
// Ver §6.5 de planifica.md.
//
// No requiere autenticación (errores de app pueden ocurrir en pantallas
// de login/registro). Defensas:
//
// - Rate limit estricto por IP: 10 req/min (antes 30).
// - Tamaño máximo razonable: stack ≤ 1000 chars (95 % de stacks útiles
//   caben), array ≤ 10 errores (antes 20).
// - Deduplicación por hash en una LRU local: el MISMO stack del mismo
//   user-agent solo se loguea una vez por minuto. Esto frena bucles
//   ruidosos en el cliente que repiten el mismo error 60×/seg.
// - Logger seguro: redacta tokens y patrones sensibles.

import { z } from 'zod'
import { createHash } from 'node:crypto'
import { rateLimit } from '../utils/rateLimit.js'
import { validateBody } from '../utils/validate.js'
import { logger } from '../utils/logger.js'

const errorItemSchema = z.object({
  ts: z.string().max(40).optional(),
  message: z.string().max(1000).optional(),
  name: z.string().max(200).optional(),
  stack: z.string().max(1000).optional(),
  url: z.string().max(1000).nullable().optional(),
  userAgent: z.string().max(300).nullable().optional(),
  level: z.string().max(20).optional(),
  context: z.record(z.unknown()).optional(),
})

const bodySchema = z.object({
  errors: z.array(errorItemSchema).min(1).max(10),
})

// LRU sencilla: claves vencen tras DEDUPE_TTL_MS. Cap de SIZE para no
// crecer sin límite ante atacantes que rotan hashes; al rebasarlo se
// purgan las entradas más antiguas.
const DEDUPE_TTL_MS = 60_000
const DEDUPE_MAX_SIZE = 500
const seen = new Map()

function shouldLog(hash, now) {
  if (seen.size > DEDUPE_MAX_SIZE) {
    // Purge: borrar las primeras 100 entradas (FIFO insertion order de Map).
    let toRemove = 100
    for (const k of seen.keys()) {
      if (toRemove-- <= 0) break
      seen.delete(k)
    }
  }
  const last = seen.get(hash)
  if (last && now - last < DEDUPE_TTL_MS) return false
  seen.set(hash, now)
  return true
}

function hashError(err, ua) {
  const h = createHash('sha1')
  h.update(err.name || '')
  h.update('|')
  h.update((err.stack || err.message || '').slice(0, 500))
  h.update('|')
  h.update((ua || '').slice(0, 100))
  return h.digest('hex')
}

export default defineEventHandler(async (event) => {
  // Rate limit estricto por IP.
  await rateLimit(event, { key: 'errors', limit: 10, windowMs: 60_000, scope: 'ip' })

  let body
  try {
    body = await validateBody(event, bodySchema)
  } catch {
    // No queremos romper si el body es inválido — un cliente
    // problemático no debe ensuciar logs ni fallar.
    return { ok: false }
  }

  const now = Date.now()
  for (const err of body.errors) {
    const hash = hashError(err, err.userAgent)
    if (!shouldLog(hash, now)) continue
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
