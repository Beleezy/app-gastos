<template>
  <section class="bg-theme-card rounded-2xl border border-theme-border p-4 md:p-5">
    <header class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm md:text-base font-semibold text-theme-text">Mapa de calor del mes</h3>
        <p class="text-xs text-theme-text-sec">
          Total: <span class="text-theme-text font-medium">{{ formatCurrency(totalMes) }}</span>
        </p>
      </div>
      <div class="flex items-center gap-1.5 text-[0.65rem] text-theme-text-sec">
        <span>menos</span>
        <span
          v-for="lvl in 5"
          :key="lvl"
          class="w-3 h-3 rounded-sm"
          :style="{ backgroundColor: colorForIntensity((lvl - 1) / 4) }"
        ></span>
        <span>más</span>
      </div>
    </header>

    <div class="grid grid-cols-7 gap-1.5">
      <div
        v-for="(d, idx) in diasSemana"
        :key="`h-${idx}`"
        class="text-center text-[0.65rem] uppercase tracking-wide text-theme-text-muted"
      >
        {{ d }}
      </div>
      <div
        v-for="(c, idx) in celdas"
        :key="`c-${idx}`"
        class="aspect-square rounded-md transition-transform hover:scale-105"
        :class="c.fecha ? 'cursor-default' : 'opacity-0 pointer-events-none'"
        :style="{ backgroundColor: colorForIntensity(c.intensidad) }"
        :title="c.fecha ? `${c.fecha} — ${formatCurrency(c.monto)}` : ''"
        :aria-label="c.fecha ? `${c.fecha}, ${formatCurrency(c.monto)}` : 'Día fuera del mes'"
      >
        <span v-if="c.fecha" class="block text-[0.55rem] text-theme-text-muted text-right pr-1 pt-0.5">
          {{ Number(c.fecha.slice(8, 10)) }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useHeatmapData } from '~/composables/useHeatmapData'

const props = defineProps({
  gastos: { type: Array, default: () => [] },
  mes: { type: Number, required: true },
  anio: { type: Number, required: true },
})

const { formatCurrency } = useFormatters()

const gastosRef = computed(() => props.gastos)
const mesRef = computed(() => props.mes)
const anioRef = computed(() => props.anio)

const { celdas, totalMes } = useHeatmapData({
  gastos: gastosRef,
  mes: mesRef,
  anio: anioRef,
  weekStart: 1,
})

const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function colorForIntensity(i) {
  if (!i || i <= 0) return 'rgba(148,163,184,0.12)'
  // gradient hacia el accent del tema con alpha en función de la intensidad
  const alpha = 0.18 + i * 0.62
  return `color-mix(in srgb, var(--color-accent) ${Math.round(alpha * 100)}%, transparent)`
}
</script>
