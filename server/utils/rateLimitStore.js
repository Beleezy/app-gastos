// Store de rate-limit con dos drivers:
//
// - memory (default): Map en proceso. Vale para single-instance y dev.
// - upstash: Upstash Redis vía REST API (sin dependencias extras).
//   Funciona en serverless (Vercel/Netlify/CF) porque es HTTP, no socket.
//
// Selección automática:
//   - Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN están
//     configurados → driver upstash.
//   - En otro caso → memory (con warning en producción).
//
// Interfaz pública del store:
//   async incr(bucketKey, windowMs) → { count, resetAt }
//
// Contrato de atomicidad:
//   - memory: secuencial en el event loop, atómico por definición.
//   - upstash: usa el endpoint /pipeline para encadenar INCR + EXPIRE +
//     PTTL en una sola llamada HTTP. Si la clave no existía, INCR la
//     crea con valor 1 y EXPIRE le pone el TTL de la ventana.
//
// `resetAt` se calcula con el TTL en memoria del cliente: Date.now() + ttl.
// Hay un pequeño drift por la latencia HTTP pero es ≤ 100 ms, irrelevante
// para ventanas de 60 s / 1 h.

import { logger } from './logger.js'

// ── Driver memoria ──────────────────────────────────────────────

const buckets = new Map()
const SWEEP_INTERVAL_MS = 5 * 60 * 1000
let lastSweep = Date.now()

function sweep(now) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

const memoryStore = {
  name: 'memory',
  async incr(bucketKey, windowMs) {
    const now = Date.now()
    sweep(now)
    let bucket = buckets.get(bucketKey)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(bucketKey, bucket)
    }
    bucket.count += 1
    return { count: bucket.count, resetAt: bucket.resetAt }
  },
}

// ── Driver Upstash REST ─────────────────────────────────────────

function upstashEnabled() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function buildUpstashStore() {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '')
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  const prefix = process.env.RATE_LIMIT_KEY_PREFIX || 'rl'

  // Encadena INCR + EXPIRE (NX) + PTTL en una sola request HTTP. EXPIRE
  // NX sólo establece TTL si no había uno → garantiza que el bucket
  // expire al cerrarse la ventana incluso si la clave no existía.
  async function pipeline(cmds) {
    const res = await fetch(`${baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmds),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Upstash ${res.status}: ${text.slice(0, 200)}`)
    }
    return res.json()
  }

  return {
    name: 'upstash',
    async incr(bucketKey, windowMs) {
      const k = `${prefix}:${bucketKey}`
      const ttlSec = Math.max(1, Math.ceil(windowMs / 1000))
      // [INCR k] [EXPIRE k ttl NX] [PTTL k]
      const out = await pipeline([
        ['INCR', k],
        ['EXPIRE', k, String(ttlSec), 'NX'],
        ['PTTL', k],
      ])
      const count = Number(out?.[0]?.result ?? 0)
      let pttl = Number(out?.[2]?.result ?? -1)
      // Si PTTL devuelve -1 (sin TTL) o -2 (no existe), usamos el TTL
      // que acabamos de pedir como fallback. -1 puede pasar si EXPIRE
      // NX falló por race condition; -2 no debería ocurrir tras el INCR.
      if (pttl <= 0) pttl = windowMs
      return { count, resetAt: Date.now() + pttl }
    },
  }
}

// ── Selección de driver ─────────────────────────────────────────

let _store = null
function getStore() {
  if (_store) return _store
  if (upstashEnabled()) {
    _store = buildUpstashStore()
    logger.info('rate-limit store: upstash')
  } else {
    _store = memoryStore
    if (process.env.NODE_ENV === 'production') {
      logger.warn(
        'rate-limit store: memory (no Upstash configurado). En despliegues serverless multi-instancia esto NO bloquea efectivamente — configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.',
        {},
      )
    }
  }
  return _store
}

// Solo para tests: forzar el driver in-memory aunque haya env vars.
export function _resetStoreForTests() {
  _store = null
  buckets.clear()
}

export async function incrBucket(bucketKey, windowMs) {
  try {
    return await getStore().incr(bucketKey, windowMs)
  } catch (e) {
    // Fail-open: si Upstash está caído, NO bloqueamos a usuarios
    // legítimos. Loguea el error para alertar pero permite el request.
    // Alternativa fail-closed sería más estricta pero romper el rate
    // limit no es un fallo de seguridad — el resto de defensas siguen
    // activas (auth, CORS, Zod, etc.).
    logger.error('rate-limit store fallo (fail-open)', { error: e })
    return { count: 1, resetAt: Date.now() + windowMs }
  }
}
