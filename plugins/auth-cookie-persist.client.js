// Fix para PWA instalada en Android: cuando el usuario desliza la app desde
// "recientes", Chrome mata el WebView y descarta los cookies de sesión
// (sin Max-Age). El cliente de Supabase a veces escribe los cookies de auth
// sin Max-Age explícito, quedando como "session cookies".
//
// Este plugin escucha los cambios de sesión y re-escribe los cookies sb-*
// con Max-Age de 1 año, forzando que sobrevivan al cierre de la app.

const ONE_YEAR = 60 * 60 * 24 * 365

function persistSupabaseCookies() {
  if (typeof document === 'undefined') return

  const isSecure = location.protocol === 'https:'
  const attrs = `path=/; max-age=${ONE_YEAR}; samesite=lax${isSecure ? '; secure' : ''}`

  for (const raw of document.cookie.split(';')) {
    const eq = raw.indexOf('=')
    if (eq < 0) continue
    const name = raw.slice(0, eq).trim()
    const value = raw.slice(eq + 1)
    if (!name.startsWith('sb-')) continue
    document.cookie = `${name}=${value}; ${attrs}`
  }
}

export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()

  persistSupabaseCookies()

  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) return
    if (
      event === 'SIGNED_IN' ||
      event === 'TOKEN_REFRESHED' ||
      event === 'INITIAL_SESSION' ||
      event === 'USER_UPDATED'
    ) {
      persistSupabaseCookies()
    }
  })
})
