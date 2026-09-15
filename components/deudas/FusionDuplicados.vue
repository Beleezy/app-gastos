<template>
  <SharedBaseBottomSheet
    v-if="modelValue"
    title="Personas duplicadas"
    data-testid="fusion-duplicados"
    @close="cerrar"
  >
    <p class="text-sm text-theme-text-sec mb-3">
      Nombres que parecen la misma persona. Elige cuál se queda y las demás se fusionan en ella: sus
      deudas, pagos y saldos pasan a la que elijas.
    </p>

    <div v-if="cargando" class="space-y-2" aria-busy="true">
      <div v-for="i in 2" :key="i" class="h-20 rounded-xl bg-theme-border-md shimmer"></div>
    </div>

    <SharedEmptyState
      v-else-if="!grupos.length"
      titulo="No hay duplicados"
      descripcion="No encontramos nombres parecidos entre tus personas."
      data-testid="fusion-vacio"
    />

    <ul v-else class="space-y-3">
      <li
        v-for="(grupo, i) in grupos"
        :key="grupo.map((p) => p.id).join('-')"
        class="rounded-xl border border-theme-border bg-theme-card p-3"
        data-testid="fusion-grupo"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-theme-text-muted mb-2">
          Grupo {{ i + 1 }}
        </p>
        <label
          v-for="p in grupo"
          :key="p.id"
          class="flex items-center gap-3 py-2 tap-target cursor-pointer"
        >
          <input
            v-model="destino[i]"
            type="radio"
            :name="`destino-${i}`"
            :value="p.id"
            class="w-5 h-5 accent-theme-accent"
          />
          <span class="text-sm text-theme-text flex-1 min-w-0 truncate">{{ p.nombre }}</span>
          <span
            v-if="destino[i] === p.id"
            class="text-[0.6875rem] px-1.5 py-0.5 rounded-full bg-theme-accent-bg text-theme-accent leading-none"
            >se queda</span
          >
        </label>
        <button
          type="button"
          class="mt-2 w-full py-2.5 rounded-xl bg-theme-accent text-theme-on-accent text-sm font-semibold disabled:opacity-50 tap-target"
          :disabled="fusionando === i"
          data-testid="fusion-confirmar"
          @click="fusionar(i)"
        >
          {{ fusionando === i ? 'Fusionando...' : `Fusionar en ${nombreDestino(i)}` }}
        </button>
      </li>
    </ul>
  </SharedBaseBottomSheet>
</template>

<script setup>
// Fusionar personas duplicadas en Deudas. Los endpoints existían desde hace
// tiempo (/api/deudas/personas/merge-sugerencias y /merge) y ninguna
// pantalla los usaba. Las sugerencias las calcula el servidor por
// similitud de nombre; aquí solo se elige el destino de cada grupo.
const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'fusionado'])

const { apiFetch } = useApiFetch()
const toast = useToast()

const grupos = ref([])
const destino = ref([])
const cargando = ref(false)
const fusionando = ref(null)

async function cargar() {
  cargando.value = true
  try {
    // `_t`: el endpoint cachea 5 min y tras una fusión hay que volver a pedir.
    const data = await apiFetch('/api/deudas/personas/merge-sugerencias', {
      query: { _t: Date.now() },
    })
    grupos.value = data?.sugerencias || []
    destino.value = grupos.value.map((g) => g[0]?.id)
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudieron buscar duplicados'))
    grupos.value = []
  } finally {
    cargando.value = false
  }
}

function nombreDestino(i) {
  const id = destino.value[i]
  return grupos.value[i]?.find((p) => p.id === id)?.nombre || 'la elegida'
}

async function fusionar(i) {
  const grupo = grupos.value[i]
  const destinoId = destino.value[i]
  const origenIds = grupo.map((p) => p.id).filter((id) => id !== destinoId)
  if (!destinoId || !origenIds.length) return
  fusionando.value = i
  try {
    const res = await apiFetch('/api/deudas/personas/merge', {
      method: 'POST',
      body: { destinoId, origenIds },
    })
    const n = res?.deudasReasignadas ?? 0
    toast.success(
      `Listo: ${origenIds.length + 1} personas fusionadas en ${nombreDestino(i)}` +
        (n ? ` (${n} deudas movidas)` : ''),
    )
    emit('fusionado')
    await cargar()
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo fusionar'))
  } finally {
    fusionando.value = null
  }
}

function cerrar() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) cargar()
  },
  { immediate: true },
)
</script>
