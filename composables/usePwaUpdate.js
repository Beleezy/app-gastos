// Composable para detectar actualizaciones del Service Worker y exponer
// el estado al componente UI. Ver §3.11 / §5.A de planifica.md.
//
// @vite-pwa/nuxt registra el SW automáticamente en modo autoUpdate. Aquí
// escuchamos los eventos del registro para mostrar un toast si hay
// nueva versión esperando, dejando al usuario decidir cuándo recargar.

export function usePwaUpdate() {
  const needRefresh = useState('pwa-need-refresh', () => false)
  const offlineReady = useState('pwa-offline-ready', () => false)
  const updating = ref(false)

  let waitingWorker = null

  function attachListeners(reg) {
    if (!reg) return

    function trackInstalling(installing) {
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = installing
          needRefresh.value = true
        }
      })
    }

    if (reg.waiting && navigator.serviceWorker.controller) {
      waitingWorker = reg.waiting
      needRefresh.value = true
    }

    if (reg.installing) {
      trackInstalling(reg.installing)
    }

    reg.addEventListener('updatefound', () => {
      trackInstalling(reg.installing)
    })
  }

  async function init() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      attachListeners(reg)

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updating.value) {
          window.location.reload()
        }
      })
    } catch (e) {
      // SW no disponible (dev o navegador sin soporte)
    }
  }

  function applyUpdate() {
    updating.value = true
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    } else if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  function dismiss() {
    needRefresh.value = false
  }

  return {
    needRefresh,
    offlineReady,
    updating,
    init,
    applyUpdate,
    dismiss,
  }
}
