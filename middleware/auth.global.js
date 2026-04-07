export default defineNuxtRouteMiddleware(async (to) => {
  // Rutas públicas — siempre permitidas
  if (to.path === '/login' || to.path === '/auth/confirm') return

  // Si está offline y ya hay sesión en caché de Supabase, dejar pasar
  if (process.client && !navigator.onLine) return

  const user = useSupabaseUser()
  if (user.value) return

  // useSupabaseUser puede no estar listo aún tras el redirect OAuth —
  // verificar directamente con getSession antes de redirigir al login
  if (process.client) {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return
  }

  return navigateTo('/login')
})
