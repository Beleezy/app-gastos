/**
 * Cliente Web Push API mínimo.
 * Ver §5.3 de planifica.md.
 *
 * Maneja:
 *  - permiso de Notification API
 *  - suscripción al PushManager del SW
 *  - registro en backend
 *
 * Requiere `runtimeConfig.public.vapidPublicKey` configurado.
 */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function usePushNotifications() {
  const isSupported = ref(false)
  const permission = ref('default')
  const isSubscribed = ref(false)
  const error = ref(null)

  function detectSupport() {
    if (typeof window === 'undefined') return
    isSupported.value =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    if (isSupported.value) {
      permission.value = Notification.permission
    }
  }

  async function requestPermission() {
    if (!isSupported.value) return false
    if (permission.value === 'granted') return true
    try {
      const r = await Notification.requestPermission()
      permission.value = r
      return r === 'granted'
    } catch (e) {
      error.value = e.message
      return false
    }
  }

  async function getRegistration() {
    if (!('serviceWorker' in navigator)) return null
    return await navigator.serviceWorker.ready
  }

  async function suscribir() {
    detectSupport()
    if (!isSupported.value) {
      error.value = 'Push no soportado'
      return null
    }
    const granted = await requestPermission()
    if (!granted) return null

    const cfg = (typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {})
    const vapidPublicKey = cfg?.public?.vapidPublicKey
    if (!vapidPublicKey) {
      error.value = 'VAPID public key no configurada'
      return null
    }

    const reg = await getRegistration()
    if (!reg) {
      error.value = 'Service Worker no disponible'
      return null
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    try {
      const json = sub.toJSON()
      const { apiFetch } = useApiFetch()
      await apiFetch('/api/notificaciones/subscribe', {
        method: 'POST',
        body: {
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
      })
      isSubscribed.value = true
      return sub
    } catch (e) {
      error.value = e?.data?.message || e?.message || 'Error registrando suscripción'
      try { await sub.unsubscribe() } catch {}
      return null
    }
  }

  async function desuscribir() {
    const reg = await getRegistration()
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return true
    const endpoint = sub.endpoint
    try {
      await sub.unsubscribe()
      const { apiFetch } = useApiFetch()
      await apiFetch('/api/notificaciones/unsubscribe', { method: 'POST', body: { endpoint } })
    } catch (e) {
      error.value = e?.message || 'Error desuscribiendo'
    }
    isSubscribed.value = false
    return true
  }

  async function refresh() {
    detectSupport()
    if (!isSupported.value) return
    const reg = await getRegistration()
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    isSubscribed.value = !!sub
  }

  return {
    isSupported,
    permission,
    isSubscribed,
    error,
    suscribir,
    desuscribir,
    refresh,
  }
}
