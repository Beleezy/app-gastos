// Idempotencia opt-in para mutaciones reintetadas desde la cola offline.
//
// El cliente (composables/useSyncQueue.js) envía un header
// `Idempotency-Key` con un id estable por mutación encolada. Si una
// petición posterior trae el mismo id, devolvemos la respuesta cacheada
// en vez de re-aplicar la operación.
//
// Backing: memoria del proceso (Map con TTL). Trade-off consciente:
//  - En un único proceso (Vercel cold start o dev) funciona.
//  - En despliegues multi-instancia un retry puede llegar a otra
//    instancia y no encontrar el slot → la operación se aplica dos
//    veces. Si llega a doler en producción, mover este store a
//    rateLimitStore (Upstash) o a la BD con un índice único.
//
// Por ahora la prioridad es defensa contra el caso común: reintento
// inmediato tras restaurar la red, casi siempre contra la misma
// instancia (sticky sessions o procesos individuales).

const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 1000

const store = new Map() // key -> { response, expiresAt }

function gc() {
  if (store.size <= MAX_ENTRIES) return
  const now = Date.now()
  for (const [k, v] of store) {
    if (v.expiresAt < now) store.delete(k)
    if (store.size <= MAX_ENTRIES) break
  }
  // Si tras limpiar expirados sigue lleno, dropear los más viejos.
  if (store.size > MAX_ENTRIES) {
    const exceso = store.size - MAX_ENTRIES
    const it = store.keys()
    for (let i = 0; i < exceso; i++) {
      const { value, done } = it.next()
      if (done) break
      store.delete(value)
    }
  }
}

function buildKey(event, usuarioId, idempotencyKey) {
  return `${usuarioId || 'anon'}:${event.method || 'POST'}:${event.path || ''}:${idempotencyKey}`
}

/**
 * Si el header Idempotency-Key viene presente y ya hay una respuesta
 * cacheada para esa combinación (usuario + método + path + key),
 * devuelve la respuesta cacheada y los handlers pueden retornarla sin
 * trabajo extra. Devuelve null cuando no hay cache hit.
 */
export function tryIdempotentReplay(event, usuarioId) {
  const key = getRequestHeader(event, 'idempotency-key')
  if (!key) return null
  const full = buildKey(event, usuarioId, key)
  const slot = store.get(full)
  if (!slot) return null
  if (slot.expiresAt < Date.now()) {
    store.delete(full)
    return null
  }
  setResponseHeader(event, 'X-Idempotent-Replay', 'true')
  return slot.response
}

/**
 * Tras ejecutar el handler con éxito, llamar a esta función para que un
 * reintento futuro con el mismo Idempotency-Key reciba la misma
 * respuesta sin re-aplicar la operación.
 */
export function rememberIdempotent(event, usuarioId, response) {
  const key = getRequestHeader(event, 'idempotency-key')
  if (!key) return
  const full = buildKey(event, usuarioId, key)
  store.set(full, { response, expiresAt: Date.now() + TTL_MS })
  gc()
}

// Útil para tests.
export function __resetIdempotencyStore() {
  store.clear()
}
