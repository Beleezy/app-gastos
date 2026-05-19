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

const PENDING_KEY = 'gastos.syncQueue.pending.v1'
const FAILED_KEY = 'gastos.syncQueue.failed.v1'

export function useSyncQueue() {
  // Usa useLocalStorage para persistir + sincronizar entre pestañas.
  // El valor inicial sólo se evalúa en cliente (SSR-safe).
  const pending = useLocalStorage(PENDING_KEY, [])
  const failed = useLocalStorage(FAILED_KEY, [])
  const isFlushing = useState('sync-queue-flushing', () => false)

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
    pending.value = [...(pending.value || []), item]
    return item.id
  }

  function dropPending(id) {
    pending.value = (pending.value || []).filter((i) => i.id !== id)
  }

  function pushFailed(item, error) {
    failed.value = [
      ...(failed.value || []),
      { ...item, error: error?.message || String(error), failedAt: new Date().toISOString() },
    ]
  }

  function clearFailed() {
    failed.value = []
  }

  async function flush(apiFetch) {
    if (isFlushing.value) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const items = pending.value || []
    if (items.length === 0) return

    isFlushing.value = true
    try {
      const snapshot = [...items]
      for (const item of snapshot) {
        item.attempts += 1
        try {
          // Idempotency-Key permite al servidor (o a un proxy) detectar
          // reintentos de la misma mutación y devolver la respuesta
          // anterior en vez de aplicarla dos veces. El item.id es estable
          // entre reintentos (se asigna una sola vez en enqueue).
          await apiFetch(item.endpoint, {
            method: item.method,
            body: item.body,
            headers: { 'Idempotency-Key': item.id },
          })
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
            // forzar persistencia tocando la ref
            pending.value = [...(pending.value || [])]
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
