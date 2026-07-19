<template>
  <div v-if="vinculos.countPendientes.value > 0" class="mb-4">
    <div
      v-for="s in vinculos.solicitudesPendientes.value"
      :key="s.id"
      class="bg-theme-accent-bg border border-theme-accent rounded-2xl p-4 mb-2"
    >
      <div class="flex items-start gap-3">
        <!-- Avatar -->
        <div
          class="w-10 h-10 rounded-full bg-theme-accent-bg flex items-center justify-center flex-shrink-0"
        >
          <span class="text-theme-accent text-sm font-bold">
            {{ (s.remitenteNombre || '?').charAt(0).toUpperCase() }}
          </span>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm text-theme-text font-medium">
            {{ s.remitenteNombre }}
          </p>
          <p class="text-xs text-theme-text-muted mt-0.5">
            Quiere vincular la persona
            <strong class="text-theme-accent">"{{ s.personaNombre }}"</strong> contigo
          </p>
          <p v-if="s.mensaje" class="text-xs text-theme-text-sec mt-1 italic">"{{ s.mensaje }}"</p>
          <p class="text-[0.6875rem] text-theme-text-muted mt-1">
            {{ formatFecha(s.createdAt) }}
          </p>

          <!-- Acciones -->
          <div class="flex gap-2 mt-3">
            <button
              class="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium active:bg-emerald-500/30 transition-colors"
              :disabled="procesando === s.id"
              @click="aceptar(s.id)"
            >
              {{ procesando === s.id ? 'Procesando...' : 'Aceptar' }}
            </button>
            <button
              class="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium active:bg-red-500/20 transition-colors"
              :disabled="procesando === s.id"
              @click="rechazar(s.id)"
            >
              Rechazar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['vinculo-aceptado'])

const vinculos = useVinculos()
const procesando = ref(null)

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function aceptar(id) {
  procesando.value = id
  try {
    await vinculos.aceptarSolicitud(id)
    emit('vinculo-aceptado')
  } catch (e) {
    // error ya en vinculos.error
  } finally {
    procesando.value = null
  }
}

async function rechazar(id) {
  procesando.value = id
  try {
    await vinculos.rechazarSolicitud(id)
  } catch (e) {
    // error ya en vinculos.error
  } finally {
    procesando.value = null
  }
}
</script>
