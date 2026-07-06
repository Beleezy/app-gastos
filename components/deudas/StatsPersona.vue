<template>
  <div v-if="deudasActivas.length > 1" class="bg-theme-card rounded-2xl p-4 mb-4">
    <p class="text-[0.6875rem] font-medium text-theme-text-sec uppercase tracking-wider mb-2">Detalle por deuda</p>
    <div class="space-y-2.5">
      <div v-for="deuda in deudasActivas" :key="deuda.id">
        <!-- Concept and amounts on first line -->
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-theme-text-sec flex-1 min-w-0 mr-2">{{ deuda.concepto }}</span>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[0.6875rem] text-theme-text-sec">{{ currencySymbol }}&nbsp;{{ formatMonto(deuda.montoPendiente) }}</span>
            <span class="text-[0.6875rem] font-medium w-8 text-right" :class="porcentajeDeuda(deuda) >= 70 ? 'text-emerald-400' : porcentajeDeuda(deuda) > 0 ? 'text-theme-accent' : 'text-theme-text-muted'">
              {{ porcentajeDeuda(deuda).toFixed(0) }}%
            </span>
          </div>
        </div>
        <!-- Progress bar -->
        <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="tabActual === 'me_deben' ? 'bg-emerald-500' : 'bg-red-500'"
            :style="{ width: porcentajeDeuda(deuda) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  deudasActivas: { type: Array, default: () => [] },
  tabActual: { type: String, default: 'me_deben' },
})

const { currencySymbol, formatMonto } = useCurrency()

function porcentajeDeuda(deuda) {
  if (deuda.montoOriginal <= 0) return 0
  return ((deuda.montoOriginal - deuda.montoPendiente) / deuda.montoOriginal) * 100
}
</script>
