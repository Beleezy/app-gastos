<template>
  <div class="px-4 py-3">
    <div class="bg-primary-800 rounded-2xl p-4">
      <h3 class="text-sm font-semibold text-white mb-4">Distribución por categoría</h3>

      <!-- Empty state -->
      <div v-if="datosGrafico.length === 0" class="text-center py-6">
        <p class="text-gray-500 text-sm">Sin datos para mostrar</p>
      </div>

      <!-- Chart -->
      <div v-else class="flex flex-col items-center gap-4">
        <!-- SVG donut -->
        <div class="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
            <circle
              v-for="(seg, idx) in datosGrafico"
              :key="idx"
              cx="18" cy="18" r="14"
              fill="none"
              :stroke="seg.color"
              stroke-width="4"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              class="cursor-pointer transition-all duration-300"
              :opacity="segmentoActivo === null || segmentoActivo === idx ? 1 : 0.3"
              @click="toggleSegmento(idx)"
            />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
            <template v-if="segmentoActivo !== null">
              <span class="text-[9px] text-gray-500 leading-tight">{{ datosGrafico[segmentoActivo].nombre }}</span>
              <span class="text-xs font-bold text-white leading-tight">{{ datosGrafico[segmentoActivo].porcentaje }}%</span>
              <span class="text-[9px] text-gray-400 leading-tight">{{ currencySymbol }} {{ formatMonto(datosGrafico[segmentoActivo].total) }}</span>
            </template>
            <template v-else>
              <span class="text-xs text-gray-500">Total</span>
              <span class="text-sm font-bold text-white">{{ currencySymbol }} {{ formatMonto(resumen.totalPlanificado) }}</span>
            </template>
          </div>
        </div>

        <!-- Legend -->
        <div class="space-y-1.5 w-full">
          <button
            v-for="(seg, idx) in datosGrafico"
            :key="seg.nombre"
            class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-all duration-200"
            :class="segmentoActivo === idx ? 'bg-primary-700/60' : 'hover:bg-primary-700/30'"
            @click="toggleSegmento(idx)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }"></span>
              <span class="text-xs text-gray-400 truncate">{{ seg.nombre }}</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[10px] text-gray-500">{{ currencySymbol }} {{ formatMonto(seg.total) }}</span>
              <span class="text-xs font-semibold w-8 text-right" :style="{ color: seg.color }">{{ seg.porcentaje }}%</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Tooltip de segmento activo -->
      <Transition name="tooltip-slide">
        <div
          v-if="segmentoActivo !== null"
          class="mt-3 px-3 py-2 rounded-xl border"
          :style="{ backgroundColor: datosGrafico[segmentoActivo].color + '18', borderColor: datosGrafico[segmentoActivo].color + '40' }"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-white">{{ datosGrafico[segmentoActivo].nombre }}</span>
            <button class="text-gray-500 hover:text-gray-300 text-xs" @click="segmentoActivo = null">✕</button>
          </div>
          <div class="flex items-center gap-4 mt-1">
            <div>
              <p class="text-[10px] text-gray-500">Planificado</p>
              <p class="text-sm font-bold text-white">{{ currencySymbol }} {{ formatMonto(datosGrafico[segmentoActivo].total) }}</p>
            </div>
            <div v-if="gastosPorCategoria[segmentoActivo]?.totalReal > 0">
              <p class="text-[10px] text-gray-500">Gastado</p>
              <p class="text-sm font-bold" :class="gastosPorCategoria[segmentoActivo].totalReal > datosGrafico[segmentoActivo].total ? 'text-red-400' : 'text-emerald-400'">
                {{ currencySymbol }} {{ formatMonto(gastosPorCategoria[segmentoActivo].totalReal) }}
              </p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500">Del total</p>
              <p class="text-sm font-bold" :style="{ color: datosGrafico[segmentoActivo].color }">{{ datosGrafico[segmentoActivo].porcentaje }}%</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
const { datosGrafico, resumen, gastosPorCategoria } = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()

const segmentoActivo = ref(null)

function toggleSegmento(idx) {
  segmentoActivo.value = segmentoActivo.value === idx ? null : idx
}
</script>

<style scoped>
.tooltip-slide-enter-active { transition: all 0.2s ease-out; }
.tooltip-slide-leave-active { transition: all 0.15s ease-in; }
.tooltip-slide-enter-from { opacity: 0; transform: translateY(-4px); }
.tooltip-slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
