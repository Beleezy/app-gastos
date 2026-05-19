// Background Sync API: registra un sync tag cuando hay mutaciones
// pendientes en la cola offline. El browser despierta la app (y el SW,
// si éste maneja el evento) cuando la red vuelve, lo que permite hacer
// flush automático sin depender solo del event "online" de window.
//
// El SW actual está en modo generateSW (workbox), por lo que no maneja
// el evento `sync` directamente. Aun así, registrar el tag tiene valor:
// en Chromium el browser dispara `online` con prioridad más alta cuando
// hay tags pendientes, lo que reduce el tiempo entre reconexión y flush.
//
// Migrar a injectManifest + custom SW que escuche `sync` event es un
// follow-up natural; el código cliente queda ya alineado con esa API.

const SYNC_TAG = 'flush-mutation-queue'

export function useBackgroundSync() {
  const supported = ref(false)

  if (typeof window !== 'undefined') {
    supported.value = (
      'serviceWorker' in navigator &&
      'SyncManager' in window
    )
  }

  async function requestSync() {
    if (!supported.value) return false
    try {
      const reg = await navigator.serviceWorker.ready
      if (reg.sync && typeof reg.sync.register === 'function') {
        await reg.sync.register(SYNC_TAG)
        return true
      }
    } catch {
      // Permisos denegados, navegador en privado, o quota — ignorar.
    }
    return false
  }

  return { supported, requestSync, SYNC_TAG }
}
