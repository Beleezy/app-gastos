import { MSG } from '~/utils/messages'

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const toast = useToast()
  const syncQueue = useSyncQueue()

  const config = useRuntimeConfig()

  const apiFetch = $fetch.create({
    onRequest: async ({ options }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { ...(options.headers || {}) }

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
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
    // Intento inicial al cargar (por si hay items de una sesión previa)
    setTimeout(() => syncQueue.flush(apiFetch).catch(() => {}), 1500)
  }

  return { provide: { apiFetch } }
})
