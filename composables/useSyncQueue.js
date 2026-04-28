/**
 * Cola offline ligera para mutaciones que fallan por falta de red.
 *
 * Ver §5.1 de planifica.md.
 *
 * Limitaciones de esta primera versión:
 * - Persiste en localStorage (capa simple, sin IndexedDB todavía).
 * - Solo encola peticiones marcadas explícitamente con `queueable: true`
 *   para evitar duplicar GETs y peticiones idempotentes.
 * - Reintenta secuencialmente al volver online; sin resolver conflictos
 *   (si el servidor responde 4xx el item se mueve a "fallidos").
 *
 * El objetivo es habilitar un "modo borrador" mientras el usuario está
 * sin red, no ser un cliente de sincronización completo.
 */

const STORAGE_KEY = 'gastos.syncQueue.v1'

function readStorage() {
  if (typeof localStorage === 'undefined') return { pending: [], failed: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { pending: [], failed: [] }
    const parsed = JSON.parse(raw)
    return {
      pending: Array.isArray(parsed.pending) ? parsed.pending : [],
      failed: Array.isArray(parsed.failed) ? parsed.failed : [],
    }
  } catch {
    return { pending: [], failed: [] }
  }
}

function writeStorage(state) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // sin storage (modo privado iOS, cuota llena)
  }
}

export function useSyncQueue() {
  const pending = useState('sync-queue-pending', () => readStorage().pending)
  const failed = useState('sync-queue-failed', () => readStorage().failed)
  const isFlushing = useState('sync-queue-flushing', () => false)

  function persist() {
    writeStorage({ pending: pending.value, failed: failed.value })
  }

  function enqueue({ endpoint, method = 'POST', body = null, label = '' }) {
    const item = {
      id: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      endpoint,
      method,
      body,
      label,
      createdAt: new Date().toISOString(),
      attempts: 0,
    }
    pending.value = [...pending.value, item]
    persist()
    return item.id
  }

  function dropPending(id) {
    pending.value = pending.value.filter((i) => i.id !== id)
    persist()
  }

  function pushFailed(item, error) {
    failed.value = [
      ...failed.value,
      { ...item, error: error?.message || String(error), failedAt: new Date().toISOString() },
    ]
    persist()
  }

  function clearFailed() {
    failed.value = []
    persist()
  }

  async function flush(apiFetch) {
    if (isFlushing.value) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (pending.value.length === 0) return

    isFlushing.value = true
    try {
      // Procesa secuencialmente para mantener orden lógico de creación.
      const items = [...pending.value]
      for (const item of items) {
        item.attempts += 1
        try {
          await apiFetch(item.endpoint, { method: item.method, body: item.body })
          dropPending(item.id)
        } catch (e) {
          // 4xx → permanente, mover a fallidos. 5xx / network → dejar en pending.
          const status = e?.response?.status ?? e?.statusCode
          if (status && status >= 400 && status < 500) {
            dropPending(item.id)
            pushFailed(item, e)
          } else if (item.attempts >= 5) {
            dropPending(item.id)
            pushFailed(item, e)
          } else {
            persist()
            break // detener para reintentar más tarde
          }
        }
      }
    } finally {
      isFlushing.value = false
    }
  }

  return {
    pending,
    failed,
    isFlushing,
    enqueue,
    dropPending,
    clearFailed,
    flush,
  }
}
