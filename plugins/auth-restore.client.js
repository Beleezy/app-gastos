export default defineNuxtPlugin(() => {
  // IMPORTANTE: este plugin NO debe ser `async` ni hacer `await` en el
  // top-level. En PWA instalada (Android), bloquear la inicialización
  // de Nuxt esperando a Supabase dejaba la pantalla blanca/splash 3-5s
  // mientras `getSession()` (y eventualmente `refreshSession`) hacían
  // I/O. Ahora la restauración corre "fire-and-forget" y Supabase
  // (clientOptions.auth.persistSession + autoRefreshToken) se encarga
  // de mantener la sesión. El middleware de auth ya llama a
  // `getSession()` como último recurso si `useSupabaseUser()` aún no
  // está hidratado, así que no perdemos correctness.
  const supabase = useSupabaseClient()

  // Defer al siguiente tick para no agregar trabajo síncrono al boot.
  // Si hay sesión pero expirada, Supabase la refresca solo gracias a
  // autoRefreshToken; aquí solo forzamos el primer `getSession` para
  // que `useSupabaseUser()` quede poblado cuanto antes.
  Promise.resolve().then(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.warn('[auth-restore] Error al restaurar sesión:', error.message)
        return
      }
      if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
        await supabase.auth.refreshSession()
      }
    } catch (e) {
      console.warn('[auth-restore] Fallo al restaurar sesión:', e)
    }
  })
})
