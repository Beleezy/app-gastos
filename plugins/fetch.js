export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const toast = useToast()

  const apiFetch = $fetch.create({
    onRequest: async ({ options }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${session.access_token}`,
        }
      }
    },
    onResponseError({ response }) {
      // Manejo amigable de rate limit (§1.2 planifica.md)
      if (response?.status === 429) {
        const retryAfter = parseInt(response.headers?.get?.('retry-after') || '0', 10)
        const seg = retryAfter > 0 ? ` Intenta en ${retryAfter}s.` : ''
        const mensaje = response._data?.message
          || `Demasiadas peticiones.${seg}`
        toast.warning(mensaje, 5000)
      }
    },
  })

  return { provide: { apiFetch } }
})
