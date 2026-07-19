<template>
  <div class="min-h-screen flex items-center justify-center px-6 bg-theme-bg">
    <div class="max-w-sm w-full text-center">
      <div
        class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 flex items-center justify-center mb-4"
      >
        <span class="text-3xl" aria-hidden="true">{{ rechazado ? '🔒' : '⏳' }}</span>
      </div>

      <h1 class="text-lg font-bold text-theme-text mb-2">
        {{ rechazado ? 'Acceso no autorizado' : 'Estamos validando tu acceso' }}
      </h1>

      <p class="text-sm text-theme-text-sec leading-relaxed">
        <template v-if="rechazado">
          Tu solicitud de acceso no fue aprobada. Si crees que es un error, comunícate con el
          administrador del sistema.
        </template>
        <template v-else>
          Tu cuenta está pendiente de aprobación. Un administrador debe habilitar tu acceso antes de
          que puedas usar la aplicación. Te avisaremos en cuanto esté lista; si necesitas
          agilizarlo, comunícate con el administrador del sistema.
        </template>
      </p>

      <p v-if="email" class="mt-3 text-xs text-theme-text-muted">
        Sesión iniciada como <span class="font-medium text-theme-text-sec">{{ email }}</span>
      </p>

      <div class="mt-6 flex flex-col gap-2">
        <button
          class="w-full py-3 rounded-xl bg-theme-accent text-theme-on-accent text-sm font-semibold disabled:opacity-50"
          :disabled="verificando"
          @click="reintentar"
        >
          {{ verificando ? 'Verificando…' : 'Ya tengo acceso, reintentar' }}
        </button>
        <button
          class="w-full py-3 rounded-xl bg-theme-card border border-theme-border text-theme-text-sec text-sm font-medium"
          @click="cerrarSesion"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })
useHead({ title: 'Acceso pendiente · Mis Finanzas' })

const { apiFetch } = useApiFetch()
const { logout } = useAuth()
const user = useSupabaseUser()
const estadoAcceso = useState('acceso.estado', () => null)

const email = computed(() => user.value?.email || '')
const rechazado = computed(() => estadoAcceso.value === 'rechazado')
const verificando = ref(false)

async function reintentar() {
  verificando.value = true
  try {
    const r = await apiFetch('/api/acceso/estado')
    estadoAcceso.value = r?.estado || null
    if (r?.estado === 'aprobado') {
      await navigateTo('/')
    }
  } catch {
    // sin cambios
  } finally {
    verificando.value = false
  }
}

async function cerrarSesion() {
  estadoAcceso.value = null
  await logout()
}
</script>
