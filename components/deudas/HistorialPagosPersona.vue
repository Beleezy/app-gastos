<template>
  <div v-if="pagos.length > 0" class="mb-5">
    <button class="flex items-center gap-2 mb-3 w-full" @click="show = !show">
      <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historial de pagos</h3>
      <span class="text-xs text-gray-500">{{ pagos.length }}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-3 h-3 text-gray-600 ml-auto transition-transform"
        :class="show ? 'rotate-180' : ''"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <!-- Revert confirmation inline -->
    <div v-if="pagoRevertiendo" class="mb-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span class="text-xs text-gray-300 flex-1">¿Revertir este pago? Se restaurará la deuda.</span>
      <button class="text-xs text-gray-500 px-2 py-1 hover:text-gray-300" @click="pagoRevertiendo = null">No</button>
      <button
        class="text-xs text-orange-400 font-semibold px-2 py-1 bg-orange-500/15 rounded-lg hover:bg-orange-500/25 active:scale-95 transition-all"
        :disabled="revirtiendo"
        @click="confirmarRevertir"
      >
        {{ revirtiendo ? '...' : 'Revertir' }}
      </button>
    </div>

    <Transition name="collapse">
      <div v-if="show" class="relative pl-6">
        <!-- Vertical timeline line -->
        <div class="absolute left-2 top-2 bottom-2 w-px bg-primary-700/50"></div>

        <div v-for="(pago, idx) in pagos" :key="idx" class="relative mb-4 last:mb-0">
          <!-- Timeline dot -->
          <div class="absolute -left-4 top-3 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-primary-900 z-10"></div>

          <!-- Payment card -->
          <div class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
            <!-- Header: date + amount + revert -->
            <div class="flex items-start justify-between mb-2.5">
              <div>
                <p class="text-xs font-semibold text-white">{{ formatFecha(pago.fechaPago) }}</p>
                <p v-if="pago.metodoPago" class="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {{ pago.metodoPago }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-blue-400">{{ currencySymbol }} {{ formatMonto(pago.montoTotal) }}</span>
                <button
                  class="w-6 h-6 flex items-center justify-center rounded-lg text-gray-600 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                  title="Revertir pago"
                  @click="pagoRevertiendo = pago"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Debts breakdown -->
            <div class="bg-primary-900/50 rounded-lg p-2.5 space-y-1.5">
              <div v-for="(detalle, dIdx) in pago.detalles" :key="dIdx" class="flex items-center gap-2">
                <span class="w-1 h-1 rounded-full bg-blue-400/60 shrink-0"></span>
                <p class="text-[11px] text-gray-400 truncate flex-1 min-w-0">{{ detalle.concepto }}</p>
                <span class="text-[11px] text-gray-300 font-medium shrink-0">{{ currencySymbol }} {{ formatMonto(detalle.montoPagado) }}</span>
              </div>
            </div>

            <!-- Notes -->
            <p v-if="pago.notas && !pago.notas.startsWith('Pago global')" class="text-[10px] text-gray-600 italic mt-1.5">
              {{ pago.notas }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
defineProps({
  pagos: { type: Array, default: () => [] },
})

const { revertirPago } = useDeudas()
const show = ref(false)
const pagoRevertiendo = ref(null)
const revirtiendo = ref(false)
const { currencySymbol, formatMonto } = useCurrency()

async function confirmarRevertir() {
  if (!pagoRevertiendo.value?.pagoIds?.length) return
  revirtiendo.value = true
  try {
    for (const pagoId of pagoRevertiendo.value.pagoIds) {
      await revertirPago(pagoId)
    }
  } finally {
    revirtiendo.value = false
    pagoRevertiendo.value = null
  }
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: opacity 0.2s ease, max-height 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
