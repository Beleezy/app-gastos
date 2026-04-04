<template>
  <div v-if="deudasActivas.length > 0 || deudasSaldadas.length > 0" class="bg-primary-800 rounded-2xl p-4 mb-4">
    <!-- Overall collection progress -->
    <div class="mb-3">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs text-gray-400">Progreso de {{ tabActual === 'me_deben' ? 'cobro' : 'pago' }}</span>
        <span class="text-xs font-medium" :class="porcentajeCobrado > 70 ? 'text-emerald-400' : 'text-blue-400'">
          {{ porcentajeCobrado.toFixed(0) }}%
        </span>
      </div>
      <div class="w-full h-2 bg-primary-900/80 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
          :style="{ width: porcentajeCobrado + '%' }"
        ></div>
      </div>
      <div class="flex items-center justify-between mt-1">
        <span class="text-[10px] text-gray-600">{{ currencySymbol }} {{ formatMonto(totalCobrado) }} cobrado</span>
        <span class="text-[10px] text-gray-600">{{ currencySymbol }} {{ formatMonto(totalOriginal) }} total</span>
      </div>
    </div>

    <!-- Mini breakdown bars per debt -->
    <div v-if="deudasActivas.length > 1" class="space-y-1.5">
      <p class="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Distribución</p>
      <div v-for="deuda in deudasActivas" :key="deuda.id" class="flex items-center gap-2">
        <span class="text-[10px] text-gray-400 truncate w-24 shrink-0">{{ deuda.concepto }}</span>
        <div class="flex-1 h-1.5 bg-primary-900/80 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="tabActual === 'me_deben' ? 'bg-emerald-500' : 'bg-red-500'"
            :style="{ width: totalPendiente > 0 ? ((deuda.montoPendiente / totalPendiente) * 100) + '%' : '0%' }"
          ></div>
        </div>
        <span class="text-[10px] text-gray-500 shrink-0">{{ currencySymbol }} {{ formatMonto(deuda.montoPendiente) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  deudasActivas: { type: Array, default: () => [] },
  deudasSaldadas: { type: Array, default: () => [] },
  tabActual: { type: String, default: 'me_deben' },
})

const { currencySymbol, formatMonto } = useCurrency()

const totalPendiente = computed(() => props.deudasActivas.reduce((s, d) => s + d.montoPendiente, 0))
const allDeudas = computed(() => [...props.deudasActivas, ...props.deudasSaldadas])
const totalOriginal = computed(() => allDeudas.value.reduce((s, d) => s + d.montoOriginal, 0))
const totalCobrado = computed(() => allDeudas.value.reduce((s, d) => s + (d.montoOriginal - d.montoPendiente), 0))
const porcentajeCobrado = computed(() => totalOriginal.value > 0 ? (totalCobrado.value / totalOriginal.value) * 100 : 0)
</script>
