<template>
  <div class="relative overflow-hidden rounded-2xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/90 px-3 pt-2.5 pb-3.5 space-y-3">
    <div class="absolute -top-10 right-0 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl"></div>
    <div class="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-violet-500/8 blur-2xl"></div>

    <template v-if="resumenFuturos.totalProyectos > 0">
      <!-- Inversión estimada (centrado) -->
      <div class="relative text-center">
        <p class="text-[10px] uppercase tracking-[0.22em] text-theme-text-muted">Inversión estimada</p>
        <p class="text-3xl font-bold text-sky-300 truncate leading-tight">
          {{ currencySymbol }}&nbsp;{{ formatMonto(resumenFuturos.totalPromedio) }}
        </p>
        <p class="mt-0.5 text-[11px] text-theme-text-sec">
          promedio de {{ resumenFuturos.totalProyectos }} proyecto{{ resumenFuturos.totalProyectos > 1 ? 's' : '' }}
        </p>
      </div>

      <!-- Rango min — máx con marcador -->
      <div class="relative">
        <div class="flex items-center justify-between text-[10px] mb-1.5">
          <span class="font-medium text-emerald-400">min {{ currencySymbol }}&nbsp;{{ formatMonto(resumenFuturos.totalMinimo) }}</span>
          <span class="font-medium text-amber-300">máx {{ currencySymbol }}&nbsp;{{ formatMonto(resumenFuturos.totalMaximo) }}</span>
        </div>
        <div class="relative h-1.5 w-full overflow-visible rounded-full bg-gradient-to-r from-emerald-500/70 via-sky-400/70 to-amber-400/70">
          <div
            class="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_0_3px_rgba(56,189,248,0.35)] transition-all duration-500"
            :style="{ left: `calc(${posicionPromedio}% - 6px)` }"
          ></div>
        </div>
      </div>

      <!-- Stats: detalles · opciones · decididos -->
      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-xl border border-theme-border bg-theme-input p-2 text-center min-w-0">
          <p class="text-[9px] uppercase tracking-[0.18em] text-theme-text-muted">Detalles</p>
          <p class="mt-0.5 text-lg font-bold text-theme-text">{{ resumenFuturos.totalDetalles }}</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-2 text-center min-w-0">
          <p class="text-[9px] uppercase tracking-[0.18em] text-theme-text-muted">Opciones</p>
          <p class="mt-0.5 text-lg font-bold text-theme-text">{{ resumenFuturos.totalOpciones }}</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-2 text-center min-w-0">
          <p class="text-[9px] uppercase tracking-[0.18em] text-theme-text-muted">Decididos</p>
          <p class="mt-0.5 text-lg font-bold text-theme-text">
            {{ resumenFuturos.progresoDecision?.decididos || 0 }}<span class="text-theme-text-muted font-semibold">/{{ resumenFuturos.progresoDecision?.total || 0 }}</span>
          </p>
        </div>
      </div>

      <!-- Barra de progreso con porcentaje -->
      <div v-if="resumenFuturos.progresoDecision?.total > 0" class="flex items-center gap-3">
        <div class="flex-1 h-2 overflow-hidden rounded-full bg-theme-input">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="resumenFuturos.progresoDecision.porcentaje === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'"
            :style="{ width: resumenFuturos.progresoDecision.porcentaje + '%' }"
          ></div>
        </div>
        <span class="shrink-0 text-xs font-semibold" :class="resumenFuturos.progresoDecision.porcentaje === 100 ? 'text-emerald-400' : 'text-sky-300'">
          {{ resumenFuturos.progresoDecision.porcentaje }}%
        </span>
      </div>

      <!-- Pie: leyenda de decisiones + pills de prioridad -->
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-3 text-[11px]">
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span :class="desglose.compradas > 0 ? 'text-emerald-400' : 'text-theme-text-muted'">{{ desglose.compradas }} compr.</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-sky-400"></span>
            <span :class="desglose.planificadas > 0 ? 'text-sky-300' : 'text-theme-text-muted'">{{ desglose.planificadas }} planif.</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-gray-500"></span>
            <span class="text-theme-text-muted">{{ desglose.pendientes }} pend.</span>
          </div>
        </div>
        <div v-if="resumenFuturos.porPrioridad" class="flex items-center gap-1.5">
          <span
            v-if="resumenFuturos.porPrioridad.alta"
            class="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400"
          >
            {{ resumenFuturos.porPrioridad.alta }} alta
          </span>
          <span
            v-if="resumenFuturos.porPrioridad.media"
            class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
          >
            {{ resumenFuturos.porPrioridad.media }} med
          </span>
          <span
            v-if="resumenFuturos.porPrioridad.baja"
            class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
          >
            {{ resumenFuturos.porPrioridad.baja }} baja
          </span>
        </div>
      </div>
    </template>

    <div v-else class="relative rounded-xl border border-dashed border-theme-border bg-theme-input/70 px-4 py-5 text-center">
      <p class="text-sm text-theme-text">Aún no tienes proyectos futuros</p>
      <p class="mt-1 text-xs text-theme-text-sec">Crea uno para comparar alternativas como una PC nueva, ropa o equipamiento.</p>
    </div>
  </div>
</template>

<script setup>
const { resumenFuturos, gastosFuturos } = useGastosFuturos()
const { currencySymbol, formatMonto } = useCurrency()

const desglose = computed(() => {
  let compradas = 0
  let planificadas = 0
  let pendientes = 0
  for (const proyecto of gastosFuturos.value) {
    for (const detalle of proyecto.detalles || []) {
      if (detalle.estadoDecision === 'comprada') compradas++
      else if (detalle.estadoDecision === 'planificada') planificadas++
      else pendientes++
    }
  }
  return { compradas, planificadas, pendientes }
})

const posicionPromedio = computed(() => {
  const min = resumenFuturos.value.totalMinimo || 0
  const max = resumenFuturos.value.totalMaximo || 0
  const prom = resumenFuturos.value.totalPromedio || 0
  if (max <= min) return 50
  const pct = ((prom - min) / (max - min)) * 100
  return Math.min(Math.max(pct, 0), 100)
})
</script>
