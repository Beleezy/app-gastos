<template>
  <div class="px-4 py-3">
    <div class="bg-primary-800 rounded-2xl p-4">
      <h3 class="text-sm font-semibold text-white mb-4">Distribución por categoría</h3>

      <!-- Empty state -->
      <div v-if="datosGrafico.length === 0" class="text-center py-6">
        <p class="text-gray-500 text-sm">Sin datos para mostrar</p>
      </div>

      <!-- Chart -->
      <div v-else class="flex items-center gap-6">
        <div class="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
            <circle
              v-for="(seg, idx) in datosGrafico"
              :key="idx"
              cx="18"
              cy="18"
              r="14"
              fill="none"
              :stroke="seg.color"
              stroke-width="4"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              class="transition-all duration-700"
            />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xs text-gray-500">Total</span>
            <span class="text-sm font-bold text-white">{{ currencySymbol }} {{ formatMonto(resumen.totalPlanificado) }}</span>
          </div>
        </div>

        <!-- Legend -->
        <div class="space-y-2 flex-1 min-w-0">
          <div v-for="seg in datosGrafico" :key="seg.nombre" class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }"></span>
              <span class="text-xs text-gray-400 truncate">{{ seg.nombre }}</span>
            </div>
            <span class="text-xs font-medium text-gray-300 shrink-0">{{ seg.porcentaje }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { datosGrafico, resumen } = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()
</script>
