// Rate limiting.
// Ver §1.2 de planifica.md.
//
// Backend pluggable via server/utils/rateLimitStore.js:
// - memory (default, in-process)
// - upstash (Redis REST API, recomendado para serverless)
//
// La API es async (a diferencia de versiones anteriores) porque el
// driver Upstash requiere fetch HTTP. Todos los callers deben await.

import { logger } from './logger.js'
import { incrBucket } from './rateLimitStore.js'

// Si la app corre detrás de un proxy de confianza (Vercel, Cloudflare,
// nginx que strippa el header del cliente) podemos confiar en
// x-forwarded-for / x-real-ip para identificar la IP real. Sin proxy
// — `docker run -p 3000:3000` directo, dev tooling, despliegues bare —
// un atacante puede inyectar el header y rotar IPs por petición para
// evadir el rate-limit por IP.
//
// Activar con env var TRUST_PROXY=1 (o NODE_ENV=production que es el
// caso típico en Vercel/CF). En dev local y stand-alone se ignora.
function isProxyTrusted() {
  if (process.env.TRUST_PROXY === '1') return true
  if (process.env.TRUST_PROXY === '0') return false
  return process.env.NODE_ENV === 'production'
}

function getClientIp(event) {
  if (isProxyTrusted()) {
    const fwd = getRequestHeader(event, 'x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
    const real = getRequestHeader(event, 'x-real-ip')
    if (real) return real.trim()
  }
  return event.node?.req?.socket?.remoteAddress || 'unknown'
}

/**
 * Aplica rate limit. Lanza 429 cuando se excede.
 * IMPORTANTE: la función es async. Los callers deben usar `await`.
 *
 * @param {object} event Nitro event.
 * @param {object} options
 * @param {string} options.key Identificador del bucket (ej. 'voz:parse').
 * @param {number} options.limit Máximo de requests dentro de la ventana.
 * @param {number} options.windowMs Ventana en ms.
 * @param {string} [options.scope] 'ip' (default) o 'user'.
 * @param {string} [options.userId] requerido si scope='user'.
 */
export async function rateLimit(event, { key, limit, windowMs, scope = 'ip', userId }) {
  const subject = scope === 'user' ? userId || 'anon' : getClientIp(event)
  const bucketKey = `${key}:${scope}:${subject}`

  const { count, resetAt } = await incrBucket(bucketKey, windowMs)
  const now = Date.now()

  const remaining = Math.max(0, limit - count)
  setResponseHeader(event, 'X-RateLimit-Limit', String(limit))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(remaining))
  setResponseHeader(event, 'X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))

  if (count > limit) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000))
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    logger.warn('Rate limit excedido', { key, scope, subject, limit, windowMs })
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Demasiadas peticiones. Intenta de nuevo en ${retryAfter} segundos.`,
    })
  }
}

/**
 * Helpers preconfigurados según el plan §1.2.
 *
 * Convención de límites:
 * - `apiGlobalIp`: hard cap por IP (anti-abuso anónimo / scrapers).
 * - `apiPerUserMinute`: tope por usuario autenticado por minuto.
 *   Llamado desde getUsuarioFromEvent para que todo endpoint con auth
 *   herede automáticamente la limitación por usuario.
 * - `apiPerUserHour`: ventana horaria complementaria para frenar abuso
 *   sostenido sin penalizar bursts puntuales.
 *
 * Todos los helpers devuelven Promise — el caller debe await.
 */
export const rateLimits = {
  vozParse: (event, userId) =>
    rateLimit(event, { key: 'voz:parse', limit: 20, windowMs: 60_000, scope: 'user', userId }),
  vozParseHora: (event, userId) =>
    rateLimit(event, {
      key: 'voz:parse:hora',
      limit: 60,
      windowMs: 60 * 60_000,
      scope: 'user',
      userId,
    }),
  vozParseImage: (event, userId) =>
    rateLimit(event, {
      key: 'voz:parse-image',
      limit: 10,
      windowMs: 60_000,
      scope: 'user',
      userId,
    }),
  vozParseImageHora: (event, userId) =>
    rateLimit(event, {
      key: 'voz:parse-image:hora',
      limit: 30,
      windowMs: 60 * 60_000,
      scope: 'user',
      userId,
    }),
  vinculosSolicitar: (event, userId) =>
    rateLimit(event, {
      key: 'vinculos:solicitar',
      limit: 5,
      windowMs: 60 * 60_000,
      scope: 'user',
      userId,
    }),
  bulkOp: (event, userId) =>
    rateLimit(event, { key: 'bulk:op', limit: 30, windowMs: 60_000, scope: 'user', userId }),
  apiDefault: (event) =>
    rateLimit(event, { key: 'api:default', limit: 120, windowMs: 60_000, scope: 'ip' }),
  apiGlobalIp: (event) =>
    rateLimit(event, { key: 'api:global', limit: 300, windowMs: 60_000, scope: 'ip' }),
  apiPerUserMinute: (event, userId) =>
    rateLimit(event, { key: 'api:user:min', limit: 120, windowMs: 60_000, scope: 'user', userId }),
  apiPerUserHour: (event, userId) =>
    rateLimit(event, {
      key: 'api:user:hour',
      limit: 3000,
      windowMs: 60 * 60_000,
      scope: 'user',
      userId,
    }),
}
