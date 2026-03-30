<template>
  <div class="px-4 pt-4 pb-2">
    <!-- Tab Selector -->
    <div class="flex bg-primary-800 rounded-xl p-1 mb-4">
      <button
        class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="tabActual === 'me_deben' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400'"
        @click="cambiarTab('me_deben')"
      >
        Me deben
      </button>
      <button
        class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="tabActual === 'yo_debo' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400'"
        @click="cambiarTab('yo_debo')"
      >
        Yo debo
      </button>
    </div>

    <!-- Balance Card -->
    <div class="bg-primary-800 rounded-2xl p-4 space-y-4">
      <!-- Balance Summary -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-primary-900/50 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Me deben</p>
          <p class="text-base font-semibold text-emerald-400">S/ {{ formatMonto(resumen.totalMeDeben) }}</p>
          <p class="text-[10px] text-gray-600 mt-0.5">{{ resumen.countMeDeben }} deuda{{ resumen.countMeDeben !== 1 ? 's' : '' }}</p>
        </div>
        <div class="bg-primary-900/50 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Yo debo</p>
          <p class="text-base font-semibold text-red-400">S/ {{ formatMonto(resumen.totalYoDebo) }}</p>
          <p class="text-[10px] text-gray-600 mt-0.5">{{ resumen.countYoDebo }} deuda{{ resumen.countYoDebo !== 1 ? 's' : '' }}</p>
        </div>
      </div>

      <!-- Net Balance -->
      <div class="border-t border-primary-700/50 pt-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">Balance neto</span>
          <span
            class="text-lg font-bold"
            :class="resumen.balanceNeto >= 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ resumen.balanceNeto >= 0 ? '+' : '' }}S/ {{ formatMonto(resumen.balanceNeto) }}
          </span>
        </div>
        <p class="text-[10px] text-gray-600 mt-1">
          {{ resumen.balanceNeto >= 0 ? 'Te deben mas de lo que debes' : 'Debes mas de lo que te deben' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { resumen, tabActual, cambiarTab } = useDeudas()

function formatMonto(valor) {
  return Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
