export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()

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
  })

  return { provide: { apiFetch } }
})
