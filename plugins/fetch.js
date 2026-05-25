import { MSG } from '~/utils/messages'

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const toast = useToast()
  const syncQueue = useSyncQueue()

  const config = useRuntimeConfig()

  // Cache del access_token en memoria. supabase.auth.getSession() lee
  // cookies + localStorage, lo que añade 10-30ms por request en cold start.
  // Refrescamos vía onAuthStateChange + TTL conservador (50 min, antes
  // que expire el token de 1h de Supabase).
  let cachedToken = null
  let cachedAt = 0
  const TOKEN_TTL = 50 * 60 * 1000

  supabase.auth.onAuthStateChange((_event, session) => {
    cachedToken = session?.access_token || null
    cachedAt = session ? Date.now() : 0
  })

  async function getToken() {
    if (cachedToken && Date.now() - cachedAt < TOKEN_TTL) return cachedToken
    const { data: { session } } = await supabase.auth.getSession()
    cachedToken = session?.access_token || null
    cachedAt = session ? Date.now() : 0
    return cachedToken
  }

  const apiFetch = $fetch.create({
    onRequest: async ({ options }) => {
      const token = await getToken()
      const headers = { ...(options.headers || {}) }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      if (config.public.devAuthBypass) {
        const devUserId = localStorage.getItem('dev_auth_user_id')
        const devEmail = localStorage.getItem('dev_auth_user_email')
        if (devUserId && config.public.devAuthToken) {
          headers['x-dev-auth-token'] = config.public.devAuthToken
          headers['x-dev-user-id'] = devUserId
          if (devEmail) headers['x-dev-user-email'] = devEmail
        }
      }

      // Perfil gestionado activo (familia): el servidor reencuadra los datos
      // de los módulos correspondientes al perfil seleccionado.
      try {
        const perfilId = typeof localStorage !== 'undefined' ? localStorage.getItem('perfil-activo-id') : null
        if (perfilId) headers['x-perfil-id'] = perfilId
      } catch {}

      options.headers = headers
    },
    onResponseError({ response }) {
      // Manejo amigable de rate limit (§1.2 planifica.md)
      if (response?.status === 429) {
        const retryAfter = parseInt(response.headers?.get?.('retry-after') || '0', 10)
        const seg = retryAfter > 0 ? ` Intenta en ${retryAfter}s.` : ''
        const fallback = MSG?.errores?.rateLimit || 'Demasiadas peticiones.'
        const mensaje = response._data?.message || `${fallback}${seg}`
        toast.warning(mensaje, 5000)
      } else if (response?.status === 401) {
        const fallback = MSG?.errores?.sesionExpirada || 'Sesión expirada.'
        toast.error(response._data?.message || fallback, 4000)
      }
    },
  })

  // Flush de la cola offline al volver online (§5.1)
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      syncQueue.flush(apiFetch).catch(() => {})
    })
    // Intento inicial al cargar (por si hay items de una sesión previa).
    // Antes era `setTimeout(..., 1500)` ciego, que se ejecutaba en plena
    // TTI y competía con los fetches de la primera página. Ahora esperamos
    // a que el browser tenga idle real (requestIdleCallback) y la app esté
    // pintada; en navegadores sin soporte caemos a un setTimeout corto
    // pero ya disparado tras `load`, no en pleno arranque.
    const flushIdle = () => syncQueue.flush(apiFetch).catch(() => {})
    const scheduleFlush = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(flushIdle, { timeout: 4000 })
      } else {
        setTimeout(flushIdle, 800)
      }
    }
    if (document.readyState === 'complete') scheduleFlush()
    else window.addEventListener('load', scheduleFlush, { once: true })
  }

  return { provide: { apiFetch } }
})
