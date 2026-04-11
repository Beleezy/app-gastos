<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-lg bg-theme-card rounded-t-3xl border-t border-theme-border max-h-[85vh] overflow-y-auto animate-slide-up">
      <!-- Handle -->
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-theme-border-md"></div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between px-5 pb-3">
        <h2 class="text-lg font-semibold text-theme-text">Confirmar gastos</h2>
        <button class="w-8 h-8 rounded-full bg-theme-border-md flex items-center justify-center text-theme-text-muted" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Transcription -->
      <div class="mx-5 mb-4 px-3 py-2 bg-theme-input rounded-lg border border-theme-border">
        <p class="text-xs text-theme-text-sec mb-1">Texto reconocido:</p>
        <p class="text-sm text-theme-text-muted italic">"{{ transcripcion }}"</p>
      </div>

      <!-- Loading -->
      <div v-if="isParsing" class="flex flex-col items-center gap-3 py-8">
        <svg class="animate-spin w-8 h-8 text-theme-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-sm text-theme-text-muted">{{ retryStatus || 'Interpretando gastos...' }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="parseError" class="mx-5 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
        <p class="text-sm text-red-400">{{ parseError }}</p>
        <button class="mt-2 text-xs text-theme-accent underline" @click="$emit('retry')">Intentar de nuevo</button>
      </div>

      <!-- Parsed expenses list -->
      <div v-else class="px-5 pb-6 space-y-3">
        <div v-for="(gasto, idx) in editableGastos" :key="idx"
          class="bg-theme-input rounded-xl border border-theme-border overflow-hidden"
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
                <p class="text-sm font-medium text-theme-text truncate">{{ gasto.concepto }}</p>
                <p class="text-xs text-theme-text-sec">{{ gasto.categoria }} · {{ formatFecha(gasto.fecha) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(gasto.monto) }}</span>
              <button class="w-7 h-7 rounded-full bg-theme-border-md flex items-center justify-center text-theme-text-muted hover:text-theme-text transition-colors"
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
          <div v-if="editingIdx === idx" class="px-4 pb-4 space-y-3 border-t border-theme-border pt-3">
            <div>
              <label class="block text-xs text-theme-text-sec mb-1">Concepto</label>
              <input v-model="gasto.concepto" type="text"
                class="w-full px-3 py-2 rounded-lg bg-theme-card border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent transition-colors"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-theme-text-sec mb-1">Monto</label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-theme-text-sec">{{ currencySymbol }}</span>
                  <input v-model.number="gasto.monto" type="number" step="0.01"
                    class="w-full pl-8 pr-3 py-2 rounded-lg bg-theme-card border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs text-theme-text-sec mb-1">Fecha</label>
                <input v-model="gasto.fecha" type="date"
                  class="w-full px-3 py-2 rounded-lg bg-theme-card border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs text-theme-text-sec mb-1">Categoría</label>
              <select v-model="gasto.categoria"
                class="w-full px-3 py-2 rounded-lg bg-theme-card border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent transition-colors"
              >
                <option v-for="cat in categoriasDisponibles" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <button class="text-xs text-theme-accent hover:text-theme-accent-light" @click="editingIdx = null">
              Listo
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="editableGastos.length === 0" class="text-center py-6">
          <p class="text-sm text-theme-text-sec">No se encontraron gastos en el texto</p>
        </div>

        <!-- Total -->
        <div v-if="editableGastos.length > 0" class="pt-2 space-y-2">
          <div class="flex items-center justify-between px-1">
            <span class="text-sm text-theme-text-muted">Total ({{ editableGastos.length }} gastos)</span>
            <span class="text-lg font-bold text-theme-text">{{ currencySymbol }} {{ formatMonto(totalGastos) }}</span>
          </div>

          <!-- Validación contra total del comprobante -->
          <div v-if="totalComprobante != null" class="px-3 py-2.5 rounded-xl border"
            :class="totalCoincide ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg v-if="totalCoincide" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span class="text-xs" :class="totalCoincide ? 'text-emerald-400' : 'text-amber-400'">
                  Total comprobante
                </span>
              </div>
              <span class="text-sm font-semibold" :class="totalCoincide ? 'text-emerald-400' : 'text-amber-400'">
                {{ currencySymbol }} {{ formatMonto(totalComprobante) }}
              </span>
            </div>
            <p v-if="!totalCoincide" class="text-[11px] text-amber-400/80 mt-1.5">
              Diferencia de {{ currencySymbol }} {{ formatMonto(Math.abs(diferenciaTotal)) }}. Revisa los montos o descuentos.
            </p>
          </div>
        </div>

        <!-- Save error -->
        <div v-if="saveError" class="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p class="text-sm text-red-400">{{ saveError }}</p>
        </div>

        <!-- Action buttons -->
        <div v-if="editableGastos.length > 0" class="flex gap-3 pt-2">
          <button
            class="flex-1 py-3 rounded-xl text-theme-text-muted font-medium text-sm border border-theme-border hover:bg-theme-border-md transition-colors"
            @click="$emit('close')"
          >
            Descartar
          </button>
          <button
            class="flex-1 py-3 rounded-xl text-theme-text font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            :class="saving ? 'bg-[var(--color-accent)]/70 cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'"
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
  retryStatus: { type: String, default: '' },
  categorias: { type: Array, default: () => [] },
  onConfirm: { type: Function, default: null },
  totalComprobante: { type: Number, default: null },
})

const emit = defineEmits(['close', 'confirm', 'retry'])

const saveError = ref(null)

import { useModalBack } from '~/composables/useModalBack'
useModalBack(() => emit('close'))

const { currencySymbol, formatMonto } = useCurrency()

const editableGastos = ref([])
const editingIdx = ref(null)
const saving = ref(false)

const { getCategoriaColor, getCategoriaIcono, getCategoriaNames } = useCategorias()

const categoriasDisponibles = computed(() => getCategoriaNames())

const totalGastos = computed(() => {
  return editableGastos.value.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0)
})

const totalCoincide = computed(() => {
  if (props.totalComprobante == null) return null
  return Math.abs(totalGastos.value - props.totalComprobante) < 0.02
})

const diferenciaTotal = computed(() => {
  if (props.totalComprobante == null) return 0
  return Math.round((totalGastos.value - props.totalComprobante) * 100) / 100
})

watch(() => props.gastos, (newVal) => {
  editableGastos.value = newVal.map(g => ({ ...g }))
}, { immediate: true, deep: true })

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
  if (!props.onConfirm) return
  saving.value = true
  saveError.value = null
  try {
    await props.onConfirm(editableGastos.value)
  } catch (e) {
    saveError.value = e.message || 'Error al guardar los gastos'
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
