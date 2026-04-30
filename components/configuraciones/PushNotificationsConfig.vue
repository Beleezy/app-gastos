<template>
  <section
    class="bg-theme-card rounded-2xl border border-theme-border p-4 md:p-5"
    aria-labelledby="push-notif-title"
  >
    <header class="mb-3">
      <h3 id="push-notif-title" class="text-sm md:text-base font-semibold text-theme-text">
        Notificaciones push
      </h3>
      <p class="text-xs text-theme-text-sec">
        Recibe avisos de pagos próximos, vínculos pendientes y recordatorios.
      </p>
    </header>

    <div v-if="!isSupported" class="text-xs text-theme-text-muted">
      Tu navegador o sistema no admite notificaciones push.
    </div>

    <div v-else-if="permission === 'denied'" class="text-xs text-amber-400">
      Permitiste antes pero las bloqueaste. Cámbialo en la configuración del
      navegador para tu dispositivo.
    </div>

    <div v-else class="flex items-center justify-between gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-theme-text">
          {{ isSubscribed ? 'Activadas en este dispositivo' : 'No activadas' }}
        </p>
        <p class="text-[0.7rem] text-theme-text-sec">
          {{ isSubscribed
            ? 'Recibirás notificaciones cuando algo importante ocurra.'
            : 'Activa para recibir avisos en este dispositivo.' }}
        </p>
        <p v-if="error" class="text-[0.7rem] text-red-400 mt-1">{{ error }}</p>
      </div>
      <button
        type="button"
        class="min-h-[40px] h-10 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        :class="isSubscribed
          ? 'bg-theme-border-md text-theme-text-sec hover:text-red-400'
          : 'bg-theme-accent text-white hover:opacity-90'"
        :disabled="loading"
        :aria-label="isSubscribed ? 'Desactivar notificaciones' : 'Activar notificaciones'"
        @click="onToggle"
      >
        {{ loading ? '…' : (isSubscribed ? 'Desactivar' : 'Activar') }}
      </button>
    </div>
  </section>
</template>

<script setup>
const {
  isSupported,
  permission,
  isSubscribed,
  error,
  suscribir,
  desuscribir,
  refresh,
} = usePushNotifications()
const toast = useToast()

const loading = ref(false)

async function onToggle() {
  if (loading.value) return
  loading.value = true
  try {
    if (isSubscribed.value) {
      await desuscribir()
      toast.info('Notificaciones desactivadas')
    } else {
      const sub = await suscribir()
      if (sub) {
        toast.success('Notificaciones activadas')
      } else if (error.value) {
        toast.error(error.value)
      } else {
        toast.warning('No se pudo activar notificaciones')
      }
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await refresh()
})
</script>
