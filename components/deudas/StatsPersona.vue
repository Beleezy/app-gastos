<template>
  <div v-if="deudasActivas.length > 0 || deudasSaldadas.length > 0" class="bg-theme-card rounded-2xl p-4 mb-4">
    <!-- Overall collection progress -->
    <div class="mb-3">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs text-theme-text-muted">Progreso de {{ tabActual === 'me_deben' ? 'cobro' : 'pago' }}</span>
        <span class="text-xs font-medium" :class="porcentajeCobrado > 70 ? 'text-emerald-400' : 'text-theme-accent'">
          {{ porcentajeCobrado.toFixed(0) }}%
        </span>
      </div>
      <div class="w-full h-2.5 bg-theme-input rounded-full overflow-hidden">
        <div
          class="h-full rounded-full bg-gradient-to-r from-theme-accent to-emerald-400 transition-all duration-500"
          :style="{ width: porcentajeCobrado + '%' }"
        ></div>
      </div>
      <div class="flex items-center justify-between mt-1">
        <span class="text-[10px] text-theme-text-muted">{{ currencySymbol }} {{ formatMonto(totalCobrado) }} cobrado</span>
        <span class="text-[10px] text-theme-text-muted">{{ currencySymbol }} {{ formatMonto(totalOriginal) }} total</span>
      </div>
    </div>

    <!-- Per-debt breakdown (vertical list for better readability) -->
    <div v-if="deudasActivas.length > 1" class="pt-2 border-t border-theme-border">
      <p class="text-[10px] font-medium text-theme-text-sec uppercase tracking-wider mb-2">Detalle por deuda</p>
      <div class="space-y-2.5">
        <div v-for="deuda in deudasActivas" :key="deuda.id">
          <!-- Concept and amounts on first line -->
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-theme-text-sec flex-1 min-w-0 mr-2">{{ deuda.concepto }}</span>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[10px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(deuda.montoPendiente) }}</span>
              <span class="text-[10px] font-medium w-8 text-right" :class="porcentajeDeuda(deuda) >= 70 ? 'text-emerald-400' : porcentajeDeuda(deuda) > 0 ? 'text-theme-accent' : 'text-theme-text-muted'">
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
  </div>
</template>

<script setup>
const props = defineProps({
  deudasActivas: { type: Array, default: () => [] },
  deudasSaldadas: { type: Array, default: () => [] },
  tabActual: { type: String, default: 'me_deben' },
})

const { currencySymbol, formatMonto } = useCurrency()

const allDeudas = computed(() => [...props.deudasActivas, ...props.deudasSaldadas])
const totalOriginal = computed(() => allDeudas.value.reduce((s, d) => s + d.montoOriginal, 0))
const totalCobrado = computed(() => allDeudas.value.reduce((s, d) => s + (d.montoOriginal - d.montoPendiente), 0))
const porcentajeCobrado = computed(() => totalOriginal.value > 0 ? (totalCobrado.value / totalOriginal.value) * 100 : 0)

function porcentajeDeuda(deuda) {
  if (deuda.montoOriginal <= 0) return 0
  return ((deuda.montoOriginal - deuda.montoPendiente) / deuda.montoOriginal) * 100
}
</script>
