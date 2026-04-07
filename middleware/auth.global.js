export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Rutas públicas — siempre permitidas
  if (to.path === '/login') return

  // Si está offline y ya hay sesión en caché de Supabase, dejar pasar
  if (process.client && !navigator.onLine) return

  // Sin usuario → redirigir al login
  if (!user.value) return navigateTo('/login')
})
