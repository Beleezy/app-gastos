export default defineNuxtRouteMiddleware(async (to) => {
  // Rutas públicas — siempre permitidas
  if (to.path === '/login' || to.path === '/auth/confirm') return

  const config = useRuntimeConfig()
  if (config.public.devAuthBypass) return

  // Si está offline y ya hay sesión en caché de Supabase, dejar pasar
  if (process.client && !navigator.onLine) return

  const user = useSupabaseUser()
  if (user.value) return

  // Cold start de PWA Android: `useSupabaseUser()` puede no estar hidratado
  // todavía aunque la cookie de sesión exista. Antes hacíamos
  // `await supabase.auth.getSession()` aquí, lo que bloqueaba el resolver
  // de la ruta 1-3 s mientras Supabase leía cookies/localStorage y
  // eventualmente refrescaba el token — se traducía en splash extendido.
  //
  // Ahora confiamos en la presencia de la cookie `sb-*-auth-token` para
  // dejar pasar sin awaitar. El plugin `auth-restore.client.js` rellena
  // `useSupabaseUser` en background y `autoRefreshToken` se encarga del
  // refresh. Si la cookie está realmente expirada e irrecuperable, el
  // primer fetch a `/api/*` recibirá 401 y el toast handler en
  // `plugins/fetch.js` ya lo maneja; la siguiente navegación no tendrá
  // ni user ni cookie y caerá al `navigateTo('/login')` de abajo.
  if (process.client) {
    const hasSessionCookie = document.cookie
      .split(';')
      .some(c => {
        const name = c.trim().split('=')[0]
        return name.startsWith('sb-') && name.includes('auth-token')
      })
    if (hasSessionCookie) return
  }

  return navigateTo('/login')
})
