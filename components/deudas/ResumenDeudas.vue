<template>
  <div class="px-4 pt-4 pb-2">
    <!-- Header principal: Me deben (protagonista) -->
    <div class="relative bg-gradient-to-br from-primary-800 to-primary-800/90 rounded-2xl p-4 mb-3 border border-primary-700/20 overflow-hidden">
      <!-- Decorative accent -->
      <div class="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl transition-colors duration-500"
        :class="tabActual === 'me_deben' ? 'bg-emerald-500/8' : 'bg-red-500/8'"
      ></div>

      <div class="relative">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full transition-colors duration-300"
              :class="tabActual === 'me_deben' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400 shadow-sm shadow-red-400/50'"
            ></div>
            <h3 class="text-sm font-semibold text-white">{{ tabActual === 'me_deben' ? 'Me deben' : 'Yo debo' }}</h3>
          </div>
          <span class="text-[10px] text-gray-500 bg-primary-900/40 px-2 py-0.5 rounded-full">
            {{ tabActual === 'me_deben' ? resumen.countMeDeben : resumen.countYoDebo }}
            deuda{{ (tabActual === 'me_deben' ? resumen.countMeDeben : resumen.countYoDebo) !== 1 ? 's' : '' }}
          </span>
        </div>
        <p class="text-2xl font-bold transition-colors duration-300" :class="tabActual === 'me_deben' ? 'text-gradient-emerald' : 'text-red-400'">
          {{ currencySymbol }} {{ formatMonto(tabActual === 'me_deben' ? resumen.totalMeDeben : resumen.totalYoDebo) }}
        </p>

        <!-- Balance visual bar -->
        <div v-if="totalGeneral > 0" class="mt-4 mb-1">
          <div class="flex h-1.5 rounded-full overflow-hidden bg-primary-900/50 gap-0.5">
            <div
              class="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
              :style="{ width: porcentajeMeDeben + '%' }"
            ></div>
            <div
              class="bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700 ease-out"
              :style="{ width: (100 - porcentajeMeDeben) + '%' }"
            ></div>
          </div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-[10px] text-emerald-400/80 font-medium">{{ porcentajeMeDeben.toFixed(0) }}% a favor</span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :class="resumen.balanceNeto >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'"
            >
              {{ currencySymbol }} {{ formatMonto(Math.abs(resumen.balanceNeto)) }} {{ resumen.balanceNeto >= 0 ? 'a favor' : 'en contra' }}
            </span>
          </div>
        </div>

        <!-- Botón pequeño para "Yo debo" -->
        <div class="border-t border-primary-700/30 mt-3 pt-3 flex items-center justify-between">
          <button
            class="flex items-center gap-2 text-xs transition-all duration-300"
            :class="tabActual === 'yo_debo' ? 'text-red-400' : 'text-gray-500 hover:text-gray-400'"
            @click="toggleYoDebo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>Yo debo: <span class="font-semibold text-red-400">{{ currencySymbol }} {{ formatMonto(resumen.totalYoDebo) }}</span></span>
            <span v-if="resumen.countYoDebo > 0" class="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[9px] font-semibold">
              {{ resumen.countYoDebo }}
            </span>
          </button>
          <!-- Tab indicator -->
          <div class="flex bg-primary-900/50 rounded-xl p-0.5 border border-primary-700/20">
            <button
              class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-300"
              :class="tabActual === 'me_deben' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-400'"
              @click="cambiarTab('me_deben')"
            >
              Me deben
            </button>
            <button
              class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-300"
              :class="tabActual === 'yo_debo' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-400'"
              @click="cambiarTab('yo_debo')"
            >
              Yo debo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { resumen, tabActual, cambiarTab } = useDeudas()

const totalGeneral = computed(() => resumen.value.totalMeDeben + resumen.value.totalYoDebo)
const porcentajeMeDeben = computed(() => {
  if (totalGeneral.value === 0) return 50
  return (resumen.value.totalMeDeben / totalGeneral.value) * 100
})

function toggleYoDebo() {
  cambiarTab(tabActual.value === 'yo_debo' ? 'me_deben' : 'yo_debo')
}

const { currencySymbol, formatMonto } = useCurrency()
</script>
