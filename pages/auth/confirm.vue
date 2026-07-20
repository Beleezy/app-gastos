<template>
  <div class="min-h-screen flex items-center justify-center bg-theme-bg">
    <div class="text-center">
      <div
        class="w-10 h-10 border-4 border-theme-accent/30 border-t-theme-accent rounded-full animate-spin mx-auto mb-4"
      ></div>
      <p class="text-sm text-theme-text-muted">Iniciando sesión...</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

onMounted(async () => {
  // El cliente Supabase lee automáticamente los tokens del hash de la URL.
  // Esperamos a que onAuthStateChange los procese.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session || user.value) {
    return navigateTo('/', { replace: true })
  }

  // Fallback: si tras 3s no hay sesión, volver al login
  setTimeout(() => {
    if (!user.value) navigateTo('/login', { replace: true })
  }, 3000)
})
</script>
