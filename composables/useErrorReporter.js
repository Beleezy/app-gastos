/**
 * Error reporter cliente con sampling y batching.
 * Versión barebone reemplazable por Sentry/Datadog cuando se decida
 * el proveedor. Ver §6.5 de planifica.md.
 *
 * - Sampling: configurable vía runtimeConfig.public.errorSampleRate
 *   (por defecto 1.0 = todo). Útil para reducir volumen en prod.
 * - Batching: agrupa eventos en una ventana de 1s y los envía juntos
 *   a /api/errors (no implementado server-side todavía; cuando exista
 *   solo hay que crear el endpoint).
 * - Sin PII: scrub de campos sensibles (tokens, keys) usando el mismo
 *   patrón que server/utils/logger.js.
 */

const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{35}/g,
  /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/g,
  /sk-[A-Za-z0-9]{20,}/g,
]

function scrub(value) {
  if (typeof value !== 'string') return value
  let out = value
  for (const re of SENSITIVE_PATTERNS) out = out.replace(re, '[REDACTED]')
  return out
}

const queue = []
let flushTimer = null

function getSampleRate() {
  try {
    const rate = useRuntimeConfig?.()?.public?.errorSampleRate
    if (rate == null) return 1.0
    const n = Number(rate)
    if (!Number.isFinite(n)) return 1.0
    return Math.max(0, Math.min(1, n))
  } catch {
    return 1.0
  }
}

function shouldSample() {
  const r = getSampleRate()
  return Math.random() < r
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flush, 1000)
}

async function flush() {
  flushTimer = null
  if (queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify({ errors: batch })], { type: 'application/json' })
      navigator.sendBeacon('/api/errors', blob)
    } else if (typeof fetch === 'function') {
      // best-effort, ignorar fallos
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: batch }),
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // sin reintentos para no entrar en loop si /api/errors falla
  }
}

export function useErrorReporter() {
  function captureException(error, context = {}) {
    if (!shouldSample()) return
    const payload = {
      ts: new Date().toISOString(),
      message: scrub(error?.message || String(error || '')),
      name: error?.name || 'Error',
      stack: scrub(error?.stack || ''),
      url: typeof location !== 'undefined' ? location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      context: scrubContext(context),
    }
    queue.push(payload)
    scheduleFlush()
  }

  function captureMessage(message, context = {}) {
    if (!shouldSample()) return
    queue.push({
      ts: new Date().toISOString(),
      message: scrub(String(message || '')),
      level: 'info',
      url: typeof location !== 'undefined' ? location.href : null,
      context: scrubContext(context),
    })
    scheduleFlush()
  }

  function flushNow() {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    return flush()
  }

  return { captureException, captureMessage, flushNow, queueLength: () => queue.length }
}

function scrubContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return ctx
  const out = {}
  for (const [k, v] of Object.entries(ctx)) {
    if (/token|key|password|secret|authorization|cookie/i.test(k)) {
      out[k] = '[REDACTED]'
    } else if (typeof v === 'string') {
      out[k] = scrub(v)
    } else {
      out[k] = v
    }
  }
  return out
}
