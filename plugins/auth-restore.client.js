export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()

  // Al abrir la PWA, el Service Worker sirve desde caché y las cookies
  // de sesión pueden no haberse procesado aún. Forzar la lectura de la
  // sesión existente para que useSupabaseUser() se hidrate antes de que
  // el middleware de auth decida redirigir al login.
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.warn('[auth-restore] Error al restaurar sesión:', error.message)
    }

    // Si hay sesión pero el token expiró, refrescar
    if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
      await supabase.auth.refreshSession()
    }
  } catch (e) {
    console.warn('[auth-restore] Fallo al restaurar sesión:', e)
  }
})
