<template>
  <div class="px-4 py-3">
    <div class="bg-theme-card rounded-2xl p-4">
      <h3 class="text-sm font-semibold text-theme-text mb-4">Distribución por categoría</h3>

      <!-- Empty state -->
      <div v-if="datosGrafico.length === 0" class="text-center py-6">
        <p class="text-theme-text-sec text-sm">Sin datos para mostrar</p>
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
              <span class="text-[9px] text-theme-text-sec leading-tight">{{ datosGrafico[segmentoActivo].nombre }}</span>
              <span class="text-xs font-bold text-theme-text leading-tight">{{ datosGrafico[segmentoActivo].porcentaje }}%</span>
              <span class="text-[9px] text-theme-text-muted leading-tight">{{ currencySymbol }} {{ formatMonto(datosGrafico[segmentoActivo].total) }}</span>
            </template>
            <template v-else>
              <span class="text-xs text-theme-text-sec">Total</span>
              <span class="text-sm font-bold text-theme-text">{{ currencySymbol }} {{ formatMonto(resumen.totalPlanificado) }}</span>
            </template>
          </div>
        </div>

        <!-- Legend con barras comparativas real vs planificado -->
        <div class="space-y-2 w-full">
          <button
            v-for="(seg, idx) in datosGrafico"
            :key="seg.nombre"
            class="w-full flex flex-col gap-1 px-2 py-1.5 rounded-lg transition-all duration-200 text-left"
            :class="segmentoActivo === idx ? 'bg-theme-border-md' : 'hover:bg-theme-border-md'"
            @click="toggleSegmento(idx)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }"></span>
                <span class="text-xs text-theme-text-muted truncate">{{ seg.nombre }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(seg.total) }}</span>
                <span class="text-xs font-semibold w-8 text-right" :style="{ color: seg.color }">{{ seg.porcentaje }}%</span>
              </div>
            </div>
            <!-- Comparativa real vs planificado -->
            <div v-if="gastosPorCategoria[idx]?.totalReal > 0" class="flex items-center gap-1.5 w-full">
              <div class="flex-1 h-1 bg-theme-input rounded-full relative overflow-hidden">
                <!-- planned baseline -->
                <div class="absolute inset-y-0 left-0 right-0 opacity-30" :style="{ backgroundColor: seg.color }"></div>
                <!-- real progress -->
                <div
                  class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  :class="gastosPorCategoria[idx].totalReal > seg.total ? 'bg-red-400' : ''"
                  :style="{
                    width: Math.min((gastosPorCategoria[idx].totalReal / seg.total) * 100, 100) + '%',
                    backgroundColor: gastosPorCategoria[idx].totalReal > seg.total ? undefined : seg.color,
                  }"
                ></div>
              </div>
              <span
                class="text-[9px] font-medium shrink-0 min-w-[50px] text-right"
                :class="gastosPorCategoria[idx].totalReal > seg.total ? 'text-red-400' : 'text-emerald-400'"
              >
                {{ currencySymbol }} {{ formatMonto(gastosPorCategoria[idx].totalReal) }}
              </span>
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
            <span class="text-xs font-medium text-theme-text">{{ datosGrafico[segmentoActivo].nombre }}</span>
            <button class="text-theme-text-sec hover:text-theme-text-sec text-xs" @click="segmentoActivo = null">✕</button>
          </div>
          <div class="flex items-center gap-4 mt-1">
            <div>
              <p class="text-[10px] text-theme-text-sec">Planificado</p>
              <p class="text-sm font-bold text-theme-text">{{ currencySymbol }} {{ formatMonto(datosGrafico[segmentoActivo].total) }}</p>
            </div>
            <div v-if="gastosPorCategoria[segmentoActivo]?.totalReal > 0">
              <p class="text-[10px] text-theme-text-sec">Gastado</p>
              <p class="text-sm font-bold" :class="gastosPorCategoria[segmentoActivo].totalReal > datosGrafico[segmentoActivo].total ? 'text-red-400' : 'text-emerald-400'">
                {{ currencySymbol }} {{ formatMonto(gastosPorCategoria[segmentoActivo].totalReal) }}
              </p>
            </div>
            <div>
              <p class="text-[10px] text-theme-text-sec">Del total</p>
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
