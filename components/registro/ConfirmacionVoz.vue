<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-lg bg-primary-800 rounded-t-3xl border-t border-primary-700/50 max-h-[85vh] overflow-y-auto animate-slide-up">
      <!-- Handle -->
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-primary-700"></div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between px-5 pb-3">
        <h2 class="text-lg font-semibold text-white">Confirmar gastos</h2>
        <button class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-gray-400" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Transcription -->
      <div class="mx-5 mb-4 px-3 py-2 bg-primary-900/50 rounded-lg border border-primary-700/30">
        <p class="text-xs text-gray-500 mb-1">Texto reconocido:</p>
        <p class="text-sm text-gray-400 italic">"{{ transcripcion }}"</p>
      </div>

      <!-- Loading -->
      <div v-if="isParsing" class="flex flex-col items-center gap-3 py-8">
        <svg class="animate-spin w-8 h-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-sm text-gray-400">Interpretando gastos...</p>
      </div>

      <!-- Error -->
      <div v-else-if="parseError" class="mx-5 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
        <p class="text-sm text-red-400">{{ parseError }}</p>
        <button class="mt-2 text-xs text-indigo-400 underline" @click="$emit('retry')">Intentar de nuevo</button>
      </div>

      <!-- Parsed expenses list -->
      <div v-else class="px-5 pb-6 space-y-3">
        <div v-for="(gasto, idx) in editableGastos" :key="idx"
          class="bg-primary-900/60 rounded-xl border border-primary-700/40 overflow-hidden"
        >
          <!-- Expense header -->
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0"
                :style="{ backgroundColor: getCategoriaColor(gasto.categoria) + '20', color: getCategoriaColor(gasto.categoria) }"
              >
                {{ getCategoriaIcono(gasto.categoria) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-white truncate">{{ gasto.concepto }}</p>
                <p class="text-xs text-gray-500">{{ gasto.categoria }} · {{ formatFecha(gasto.fecha) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-semibold text-white">S/ {{ formatMonto(gasto.monto) }}</span>
              <button class="w-7 h-7 rounded-full bg-primary-700/60 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                @click="toggleEdit(idx)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button class="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                @click="removeGasto(idx)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Edit form (expanded) -->
          <div v-if="editingIdx === idx" class="px-4 pb-4 space-y-3 border-t border-primary-700/30 pt-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Concepto</label>
              <input v-model="gasto.concepto" type="text"
                class="w-full px-3 py-2 rounded-lg bg-primary-800 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Monto</label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">S/</span>
                  <input v-model.number="gasto.monto" type="number" step="0.01"
                    class="w-full pl-8 pr-3 py-2 rounded-lg bg-primary-800 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Fecha</label>
                <input v-model="gasto.fecha" type="date"
                  class="w-full px-3 py-2 rounded-lg bg-primary-800 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Categoría</label>
              <select v-model="gasto.categoria"
                class="w-full px-3 py-2 rounded-lg bg-primary-800 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option v-for="cat in categoriasDisponibles" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <button class="text-xs text-indigo-400 hover:text-indigo-300" @click="editingIdx = null">
              Listo
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="editableGastos.length === 0" class="text-center py-6">
          <p class="text-sm text-gray-500">No se encontraron gastos en el texto</p>
        </div>

        <!-- Total -->
        <div v-if="editableGastos.length > 0" class="flex items-center justify-between px-1 pt-2">
          <span class="text-sm text-gray-400">Total ({{ editableGastos.length }} gastos)</span>
          <span class="text-lg font-bold text-white">S/ {{ formatMonto(totalGastos) }}</span>
        </div>

        <!-- Action buttons -->
        <div v-if="editableGastos.length > 0" class="flex gap-3 pt-2">
          <button
            class="flex-1 py-3 rounded-xl text-gray-400 font-medium text-sm border border-primary-700/50 hover:bg-primary-700/30 transition-colors"
            @click="$emit('close')"
          >
            Descartar
          </button>
          <button
            class="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            :class="saving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'"
            :disabled="saving"
            @click="confirmar"
          >
            <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ saving ? 'Guardando...' : 'Confirmar todos' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  gastos: { type: Array, required: true },
  transcripcion: { type: String, default: '' },
  isParsing: { type: Boolean, default: false },
  parseError: { type: String, default: null },
  categorias: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'confirm', 'retry'])

const editableGastos = ref([])
const editingIdx = ref(null)
const saving = ref(false)

const CATEGORIAS_COLORS = {
  'Alimentación': '#ef4444',
  'Transporte': '#3b82f6',
  'Vivienda': '#f59e0b',
  'Salud': '#10b981',
  'Educación': '#8b5cf6',
  'Entretenimiento': '#ec4899',
  'Vestimenta': '#f97316',
  'Servicios': '#06b6d4',
  'Ahorro': '#22c55e',
  'Deudas': '#e11d48',
  'Otros': '#6b7280',
}

const CATEGORIAS_ICONOS = {
  'Alimentación': '🍽️',
  'Transporte': '🚌',
  'Vivienda': '🏠',
  'Salud': '🏥',
  'Educación': '📚',
  'Entretenimiento': '🎮',
  'Vestimenta': '👕',
  'Servicios': '⚡',
  'Ahorro': '💰',
  'Deudas': '💳',
  'Otros': '📦',
}

const categoriasDisponibles = Object.keys(CATEGORIAS_COLORS)

const totalGastos = computed(() => {
  return editableGastos.value.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0)
})

watch(() => props.gastos, (newVal) => {
  editableGastos.value = newVal.map(g => ({ ...g }))
}, { immediate: true, deep: true })

function getCategoriaColor(nombre) {
  return CATEGORIAS_COLORS[nombre] || '#6b7280'
}

function getCategoriaIcono(nombre) {
  return CATEGORIAS_ICONOS[nombre] || '📦'
}

function formatMonto(monto) {
  return (parseFloat(monto) || 0).toFixed(2)
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const hoy = new Date().toISOString().split('T')[0]
  if (fecha === hoy) return 'Hoy'
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}`
}

function toggleEdit(idx) {
  editingIdx.value = editingIdx.value === idx ? null : idx
}

function removeGasto(idx) {
  editableGastos.value.splice(idx, 1)
}

async function confirmar() {
  if (editableGastos.value.length === 0) return
  saving.value = true
  try {
    emit('confirm', editableGastos.value)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
