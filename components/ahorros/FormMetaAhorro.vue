<template>
  <SharedBaseBottomSheet title="Metas de ahorro" @close="$emit('close')">
    <!-- Tabs -->
    <div class="grid grid-cols-2 gap-2 rounded-2xl border border-theme-border bg-theme-card p-1 mb-4">
      <button
        class="rounded-xl px-3 py-2 text-sm font-medium transition-colors"
        :class="tab === 'mensual' ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-text-sec'"
        @click="tab = 'mensual'"
      >
        Mensual
      </button>
      <button
        class="rounded-xl px-3 py-2 text-sm font-medium transition-colors"
        :class="tab === 'global' ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-text-sec'"
        @click="tab = 'global'"
      >
        Global
      </button>
    </div>

    <Transition name="page" mode="out-in">
      <div :key="tab">
        <div v-if="tab === 'mensual'">
          <p class="text-xs text-theme-text-sec mb-3">
            Meta para {{ nombreMes }} {{ anioActual }}
          </p>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-text-sec">{{ currencySymbol }}</span>
            <input
              v-model="montoMensual"
              type="number"
              step="0.01"
              :placeholder="metaMensual ? String(metaMensual) : '0.00'"
              class="w-full pl-9 pr-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
            />
          </div>
          <div v-if="metaMensual" class="mt-2 text-[10px] text-theme-text-muted">
            Meta actual: {{ currencySymbol }} {{ formatMonto(metaMensual) }}
          </div>
        </div>

        <div v-else>
          <p class="text-xs text-theme-text-sec mb-3">
            Meta acumulada de ahorro total
          </p>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-text-sec">{{ currencySymbol }}</span>
            <input
              v-model="montoGlobal"
              type="number"
              step="0.01"
              :placeholder="metaGlobal ? String(metaGlobal) : '0.00'"
              class="w-full pl-9 pr-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
            />
          </div>
          <div v-if="metaGlobal" class="mt-2 text-[10px] text-theme-text-muted">
            Meta actual: {{ currencySymbol }} {{ formatMonto(metaGlobal) }}
          </div>
        </div>
      </div>
    </Transition>

    <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

    <button
      class="w-full py-3.5 rounded-xl bg-theme-accent text-theme-on-accent font-semibold text-sm transition-colors hover:bg-theme-accent-dark mt-4 flex items-center justify-center gap-2"
      :disabled="saving"
      @click="guardar"
    >
      <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      {{ saving ? 'Guardando...' : 'Guardar meta' }}
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const emit = defineEmits(['close', 'saved'])

const { metaMensual, metaGlobal, mesActual, anioActual, nombreMes, setMeta } = useAhorros()
const { currencySymbol, formatMonto } = useCurrency()
const { success: toastSuccess } = useToast()

const tab = ref('mensual')
const montoMensual = ref(null)
const montoGlobal = ref(null)
const saving = ref(false)
const errorMsg = ref('')

async function guardar() {
  errorMsg.value = ''

  const monto = tab.value === 'mensual' ? montoMensual.value : montoGlobal.value
  if (!monto || monto <= 0) {
    errorMsg.value = 'Ingresa un monto válido'
    return
  }

  saving.value = true
  try {
    const data = {
      tipo: tab.value,
      montoObjetivo: parseFloat(monto),
    }
    if (tab.value === 'mensual') {
      data.mes = mesActual.value
      data.anio = anioActual.value
    }
    await setMeta(data)
    toastSuccess(`Meta ${tab.value} guardada`)
    emit('saved')
    emit('close')
  } catch (e) {
    errorMsg.value = 'Error al guardar la meta'
  } finally {
    saving.value = false
  }
}
</script>
