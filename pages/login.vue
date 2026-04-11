<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-primary-950 px-6">
    <!-- Logo / branding -->
    <div class="flex flex-col items-center mb-10">
      <div class="w-16 h-16 rounded-2xl bg-theme-accent-bg border border-theme-accent flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.172-.879-1.172-2.303 0-3.182.553-.44 1.278-.659 2.003-.659.727 0 1.45.219 2.003.659m-5.5 7.5A10.5 10.5 0 1 1 12 1.5a10.5 10.5 0 0 1 0 21Z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">Mis Finanzas</h1>
      <p class="text-sm text-gray-500 mt-1">Gestiona tu economía personal</p>
    </div>

    <!-- Card de login -->
    <div class="w-full max-w-sm bg-primary-800 rounded-2xl border border-primary-700/50 p-6">
      <h2 class="text-base font-semibold text-white mb-1">Iniciar sesión</h2>
      <p class="text-xs text-gray-500 mb-6">Usa tu cuenta de Google para continuar</p>

      <!-- Botón Google -->
      <button
        class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-medium text-sm rounded-xl px-4 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="handleLogin"
      >
        <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5 shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        <svg v-else class="animate-spin w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        {{ loading ? 'Redirigiendo...' : 'Continuar con Google' }}
      </button>

      <!-- Error -->
      <p v-if="errorMsg" class="mt-3 text-xs text-red-400 text-center">{{ errorMsg }}</p>
    </div>

    <p class="text-xs text-gray-700 mt-8 text-center max-w-xs">
      Al iniciar sesión aceptas que tus datos se almacenen de forma segura en tu cuenta personal.
    </p>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const { loginConGoogle } = useAuth()

const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    await loginConGoogle()
  } catch (e) {
    errorMsg.value = e?.message || 'No se pudo iniciar sesión. Intenta de nuevo.'
    loading.value = false
  }
}
</script>
