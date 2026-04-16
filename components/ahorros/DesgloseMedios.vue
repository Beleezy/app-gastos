<template>
  <div class="px-4 lg:px-0 pb-2">
    <div v-if="porMedio.length > 0" class="space-y-2">
      <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Por medio</h3>
      <div class="space-y-1.5">
        <div
          v-for="item in porMedio"
          :key="item.medioAhorroId"
          class="flex items-center gap-3 rounded-xl bg-theme-card border border-theme-border p-3"
        >
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            :style="{ backgroundColor: (item.medioColor || '#6b7280') + '26' }"
          >
            <span class="text-sm">{{ item.medioIcono || '💰' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-theme-text truncate">{{ item.medioNombre || 'Sin medio' }}</span>
              <span class="text-sm font-bold text-theme-text whitespace-nowrap ml-2">{{ currencySymbol }} {{ formatMonto(item.total) }}</span>
            </div>
            <div class="mt-1.5 relative w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                :style="{ width: porcentaje(item.total) + '%', backgroundColor: item.medioColor || '#6b7280' }"
              ></div>
            </div>
          </div>
          <span class="text-[10px] text-theme-text-muted font-medium w-10 text-right shrink-0">{{ porcentaje(item.total).toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-6">
      <p class="text-sm text-theme-text-muted">No hay ahorros este mes</p>
    </div>
  </div>
</template>

<script setup>
const { porMedio, totalMes } = useAhorros()
const { currencySymbol, formatMonto } = useCurrency()

function porcentaje(monto) {
  return totalMes.value > 0 ? (monto / totalMes.value) * 100 : 0
}
</script>
