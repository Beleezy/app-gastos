<template>
  <section class="bg-theme-card rounded-2xl border border-theme-border p-4 md:p-5">
    <header class="flex items-center justify-between mb-3 flex-wrap gap-x-3 gap-y-1.5">
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
      <button
        v-for="(c, idx) in celdas"
        :key="`c-${idx}`"
        type="button"
        class="hm-cell aspect-square rounded-md transition-all relative outline-none"
        :class="[
          c.fecha
            ? 'cursor-pointer hover:scale-105 active:scale-95'
            : 'opacity-0 pointer-events-none',
          c.fecha && c.fecha === fechaSeleccionada
            ? 'ring-2 ring-theme-accent ring-offset-1 ring-offset-theme-card scale-105'
            : '',
        ]"
        :style="{ backgroundColor: colorForIntensity(c.intensidad) }"
        :title="c.fecha ? `${c.fecha} — ${formatCurrency(c.monto)}` : ''"
        :aria-label="c.fecha ? `${c.fecha}, ${formatCurrency(c.monto)}` : 'Día fuera del mes'"
        :disabled="!c.fecha"
        @click="seleccionarDia(c)"
      >
        <!-- Texto blanco sobre celdas intensas: el gris muted perdía contraste -->
        <span
          v-if="c.fecha"
          class="block text-[0.6875rem] font-medium text-right pr-1 pt-0.5 leading-none"
          :class="c.intensidad > 0.55 ? 'text-white' : 'text-theme-text-muted'"
        >
          {{ Number(c.fecha.slice(8, 10)) }}
        </span>
      </button>
    </div>

    <!-- Detalle del día seleccionado -->
    <Transition name="detail">
      <div v-if="fechaSeleccionada" class="mt-4 pt-4 border-t border-theme-border">
        <div class="flex items-center justify-between mb-3">
          <div class="min-w-0">
            <p
              class="text-[0.6875rem] uppercase tracking-wider text-theme-text-muted font-semibold"
            >
              Detalle del día
            </p>
            <h4 class="text-sm font-semibold text-theme-text truncate">{{ fechaFormateada }}</h4>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-sm font-bold text-theme-accent">{{
              formatCurrency(totalDiaSeleccionado)
            }}</span>
            <button
              class="w-7 h-7 rounded-full bg-theme-border-md flex items-center justify-center text-theme-text-muted hover:text-theme-text transition-colors"
              aria-label="Cerrar detalle"
              @click="fechaSeleccionada = null"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="gastosDelDia.length === 0" class="text-center py-4">
          <p class="text-xs text-theme-text-muted">Sin gastos registrados este día</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="g in gastosDelDia"
            :key="g.id"
            class="flex items-center gap-3 px-3 py-2 rounded-xl bg-theme-input border border-theme-border"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :style="{ backgroundColor: (g.categoriaColor || '#6b7280') + '20' }"
            >
              <span class="text-sm leading-none">{{ g.categoriaIcono || '💸' }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-theme-text font-medium break-words leading-tight">
                {{ g.concepto }}
              </p>
              <span
                class="inline-block text-[0.6875rem] font-medium px-1.5 py-0.5 rounded-md leading-none mt-1"
                :style="{
                  backgroundColor: (g.categoriaColor || '#6b7280') + '18',
                  color: g.categoriaColor || '#6b7280',
                }"
              >
                {{ g.categoriaNombre || 'Otros' }}
              </span>
            </div>
            <span class="text-sm font-semibold text-theme-text whitespace-nowrap shrink-0">
              {{ formatCurrency(g.monto) }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
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

const fechaSeleccionada = ref(null)

function seleccionarDia(c) {
  if (!c.fecha) return
  // Toggle: clic en el mismo día deselecciona
  fechaSeleccionada.value = fechaSeleccionada.value === c.fecha ? null : c.fecha
}

// Si cambian mes/año, limpiar selección
watch([mesRef, anioRef], () => {
  fechaSeleccionada.value = null
})

const gastosDelDia = computed(() => {
  if (!fechaSeleccionada.value) return []
  return props.gastos
    .filter((g) => g.fecha === fechaSeleccionada.value)
    .sort((a, b) => (b.monto || 0) - (a.monto || 0))
})

const totalDiaSeleccionado = computed(() =>
  gastosDelDia.value.reduce((sum, g) => sum + Number(g.monto || 0), 0),
)

const fechaFormateada = computed(() => {
  if (!fechaSeleccionada.value) return ''
  const [a, m, d] = fechaSeleccionada.value.split('-')
  const fecha = new Date(Number(a), Number(m) - 1, Number(d))
  return fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

function colorForIntensity(i) {
  if (!i || i <= 0) return 'rgba(148,163,184,0.12)'
  // gradient hacia el accent del tema con alpha en función de la intensidad
  const alpha = 0.18 + i * 0.62
  return `color-mix(in srgb, var(--color-accent) ${Math.round(alpha * 100)}%, transparent)`
}
</script>

<style scoped>
/* Fallback visible si el navegador no soporta color-mix (la declaración inline
   inválida se ignora y cae a este tinte en vez de quedar transparente/blanco). */
.hm-cell {
  background-color: rgba(148, 163, 184, 0.18);
}

.detail-enter-active,
.detail-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.detail-enter-from,
.detail-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  border-top-width: 0;
}
.detail-enter-to,
.detail-leave-from {
  opacity: 1;
  max-height: 1200px;
}
</style>
