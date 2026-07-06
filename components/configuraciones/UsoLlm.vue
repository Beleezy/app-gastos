<template>
  <section class="bg-theme-card rounded-2xl border border-theme-border p-4 md:p-5">
    <header class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm md:text-base font-semibold text-theme-text">Procesamiento por voz y foto</h3>
        <p class="text-xs text-theme-text-sec">
          Uso del asistente de IA este mes. Si llegas al límite, podrás seguir registrando manualmente.
        </p>
      </div>
      <button
        type="button"
        class="text-xs text-theme-text-sec underline hover:text-theme-text transition-colors shrink-0 min-h-[2.75rem] px-2 -mx-2"
        :disabled="loading"
        @click="cargar"
      >
        Actualizar
      </button>
    </header>

    <div v-if="loading" class="space-y-2">
      <div class="h-3 bg-theme-border-md rounded animate-pulse"></div>
      <div class="h-3 bg-theme-border-md rounded w-2/3 animate-pulse"></div>
    </div>

    <div v-else-if="error" class="text-xs text-red-400">
      No se pudo cargar el consumo. {{ error }}
    </div>

    <div v-else-if="uso" class="space-y-3">
      <div>
        <div class="flex items-baseline justify-between mb-1">
          <span class="text-xs text-theme-text-sec">Usadas</span>
          <span class="text-sm font-semibold text-theme-text">
            {{ uso.usadas }} / {{ uso.limite }}
          </span>
        </div>
        <div
          class="h-2 w-full bg-theme-border-md rounded-full overflow-hidden"
          role="progressbar"
          :aria-valuenow="uso.porcentaje"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Consumo mensual de IA: ${uso.porcentaje}%`"
        >
          <div
            class="h-full transition-all duration-300"
            :class="barClass"
            :style="{ width: `${Math.min(100, uso.porcentaje)}%` }"
          ></div>
        </div>
        <p class="text-[0.7rem] text-theme-text-muted mt-1.5">
          Restantes: {{ uso.restantes }} peticiones este mes.
        </p>
      </div>

      <ul v-if="uso.detallesPorEndpoint?.length" class="space-y-1 pt-2 border-t border-theme-border">
        <li
          v-for="d in uso.detallesPorEndpoint"
          :key="d.endpoint"
          class="flex items-center justify-between text-xs"
        >
          <span class="text-theme-text-sec">{{ formatEndpoint(d.endpoint) }}</span>
          <span class="text-theme-text font-medium">{{ d.totalRequests }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const uso = ref(null)
const loading = ref(false)
const error = ref(null)

const barClass = computed(() => {
  if (!uso.value) return 'bg-theme-accent'
  if (uso.value.porcentaje >= 90) return 'bg-red-500'
  if (uso.value.porcentaje >= 75) return 'bg-amber-500'
  return 'bg-theme-accent'
})

function formatEndpoint(key) {
  if (!key) return key
  if (key.startsWith('voz/parse-image')) return 'Foto de recibos'
  if (key.startsWith('voz/parse-stream')) return 'Voz (streaming)'
  if (key.startsWith('voz/parse')) return 'Voz'
  return key
}

async function cargar() {
  loading.value = true
  error.value = null
  try {
    uso.value = await apiFetch('/api/voz/uso')
  } catch (e) {
    error.value = e?.data?.message || e?.message || 'Error desconocido'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
})
</script>
