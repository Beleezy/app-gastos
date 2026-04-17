<template>
  <SharedBaseBottomSheet title="Vincular con usuario" @close="$emit('close')">
    <p class="text-sm text-theme-text-muted mb-4">
      Envía una solicitud para vincular las deudas de <strong class="text-theme-text">{{ personaNombre }}</strong> con su cuenta en la app. Al aceptar, las deudas se sincronizarán automáticamente.
    </p>

    <!-- Email -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Email del usuario</label>
      <input
        v-model="form.email"
        type="email"
        placeholder="correo@ejemplo.com"
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <!-- Mensaje opcional -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Mensaje (opcional)</label>
      <textarea
        v-model="form.mensaje"
        rows="2"
        placeholder="Ej: Hola, estas son las deudas que tenemos pendientes..."
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
      />
    </div>

    <!-- Error -->
    <p v-if="vinculos.error.value" class="text-red-400 text-xs">
      {{ vinculos.error.value }}
    </p>

    <!-- Solicitudes enviadas para esta persona -->
    <div v-if="solicitudesPersona.length > 0" class="mt-2">
      <p class="text-xs font-medium text-theme-text-sec mb-2">Solicitudes enviadas</p>
      <div
        v-for="s in solicitudesPersona"
        :key="s.id"
        class="flex items-center justify-between py-2 px-3 rounded-lg bg-theme-input mb-1.5"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm text-theme-text-sec truncate">{{ s.destinatarioEmail }}</p>
          <p class="text-[10px] text-theme-text-sec">
            {{ s.estado === 'pendiente' ? 'Esperando respuesta' : s.estado }}
          </p>
        </div>
        <button
          v-if="s.estado === 'pendiente'"
          class="text-xs text-red-400 hover:text-red-300 px-2 py-1"
          @click="cancelar(s.id)"
        >
          Cancelar
        </button>
        <span
          v-else
          class="text-[10px] px-2 py-0.5 rounded-full"
          :class="{
            'bg-emerald-500/20 text-emerald-400': s.estado === 'aceptada',
            'bg-red-500/20 text-red-400': s.estado === 'rechazada',
          }"
        >
          {{ s.estado }}
        </span>
      </div>
    </div>

    <!-- Botón enviar -->
    <button
      class="w-full py-3 rounded-xl font-medium text-sm transition-all mt-2"
      :class="isValid ? 'bg-theme-accent-dark text-theme-on-accent active:bg-theme-accent-dark' : 'bg-theme-card text-theme-text-muted cursor-not-allowed'"
      :disabled="!isValid || vinculos.isLoading.value"
      @click="enviar"
    >
      {{ vinculos.isLoading.value ? 'Enviando...' : 'Enviar solicitud' }}
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  personaEntidadId: { type: String, required: true },
  personaNombre: { type: String, required: true },
})

const emit = defineEmits(['close', 'enviada'])

const vinculos = useVinculos()

const form = reactive({
  email: '',
  mensaje: '',
})

const isValid = computed(() => {
  return form.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
})

const solicitudesPersona = computed(() => {
  return vinculos.solicitudesEnviadas.value.filter(
    s => s.personaEntidadId === props.personaEntidadId
  )
})

onMounted(() => {
  vinculos.fetchEnviadas()
})

async function enviar() {
  if (!isValid.value) return
  try {
    await vinculos.enviarSolicitud(props.personaEntidadId, form.email.trim(), form.mensaje.trim() || null)
    form.email = ''
    form.mensaje = ''
    emit('enviada')
  } catch (e) {
    // error ya se muestra via vinculos.error
  }
}

async function cancelar(id) {
  try {
    await vinculos.cancelarSolicitud(id)
  } catch (e) {
    // error ya se muestra
  }
}
</script>
