<template>
  <div class="relative bg-gradient-to-br from-theme-card/80 to-theme-card/60 rounded-2xl border border-theme-border px-4 py-4 overflow-hidden">
    <div class="absolute -top-8 -right-8 w-32 h-32 bg-theme-accent-bg rounded-full blur-2xl"></div>

    <div class="relative flex items-end justify-between mb-3">
      <div>
        <p class="text-[10px] text-theme-text-sec mb-1 uppercase tracking-wider font-medium">Gastado este mes</p>
        <p class="text-2xl font-bold text-gradient-blue">{{ currencySymbol }} {{ formatMonto(totalMes) }}</p>
      </div>
      <div class="text-right">
        <p class="text-[10px] text-theme-text-sec mb-1 uppercase tracking-wider font-medium">Presupuesto</p>
        <!-- Edit mode -->
        <div v-if="editando" class="flex items-center gap-1 justify-end">
          <span class="text-sm text-theme-text-muted">{{ currencySymbol }}</span>
          <input
            ref="inputRef"
            v-model="presupuestoTemp"
            type="number"
            step="0.01"
            class="w-28 bg-theme-input border border-theme-accent rounded-lg px-2 py-1 text-right text-theme-text text-base font-bold focus:outline-none"
            @keyup.enter="guardar"
            @blur="guardar"
          />
        </div>
        <!-- Display mode -->
        <div v-else class="flex items-center gap-1.5 justify-end">
          <button
            class="text-base font-semibold text-theme-text-sec hover:text-theme-accent transition-colors whitespace-nowrap"
            @click="iniciarEdicion"
          >
            {{ presupuesto > 0 ? `${currencySymbol} ${formatMonto(presupuesto)}` : 'Sin límite' }}
          </button>
          <button
            v-if="presupuestoDefault > 0 && presupuesto !== presupuestoDefault"
            class="w-6 h-6 flex items-center justify-center rounded-lg bg-theme-accent-bg text-theme-accent hover:bg-theme-accent-bg transition-colors"
            title="Sincronizar con presupuesto predeterminado"
            @click="sincronizar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="presupuesto > 0" class="relative">
      <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden mb-2">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out"
          :class="porcentaje > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : porcentaje > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
          :style="{ width: Math.min(porcentaje, 100) + '%' }"
        ></div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full"
          :class="saldo >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'"
        >
          {{ saldo >= 0 ? 'Disponible' : 'Excedido' }}: {{ currencySymbol }} {{ formatMonto(Math.abs(saldo)) }}
        </span>
        <span class="text-[10px] text-theme-text-sec font-medium">{{ porcentaje.toFixed(0) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  totalMes: { type: Number, default: 0 },
  presupuesto: { type: Number, default: 0 },
  presupuestoDefault: { type: Number, default: 0 },
})

const emit = defineEmits(['update:presupuesto'])

const { currencySymbol, formatMonto } = useCurrency()

const editando = ref(false)
const presupuestoTemp = ref(0)
const inputRef = ref(null)

const porcentaje = computed(() => {
  if (props.presupuesto <= 0) return 0
  return (props.totalMes / props.presupuesto) * 100
})

const saldo = computed(() => props.presupuesto - props.totalMes)

function iniciarEdicion() {
  presupuestoTemp.value = props.presupuesto
  editando.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function guardar() {
  const monto = parseFloat(presupuestoTemp.value)
  if (!isNaN(monto) && monto >= 0) {
    emit('update:presupuesto', monto)
  }
  editando.value = false
}

function sincronizar() {
  emit('update:presupuesto', props.presupuestoDefault)
}
</script>
