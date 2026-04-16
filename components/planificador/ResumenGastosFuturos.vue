<template>
  <div class="px-4 pt-4 pb-2">
    <div class="relative overflow-hidden rounded-2xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/90 p-4 space-y-4">
      <div class="absolute -top-10 right-0 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl"></div>
      <div class="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-violet-500/8 blur-2xl"></div>

      <div class="relative flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-theme-text-muted">Gastos futuros</p>
          <h3 class="mt-1 text-base font-semibold text-theme-text">Comparador de compras y proyectos</h3>
          <p class="mt-1 text-xs text-theme-text-sec">
            Guarda alternativas por detalle, links de referencia y rangos de precio.
          </p>
        </div>
        <div class="rounded-2xl bg-sky-500/12 p-3 text-sky-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h9.75m-9.75 5.25h16.5" />
          </svg>
        </div>
      </div>

      <!-- Stats principales -->
      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Proyectos</p>
          <p class="mt-1 text-lg font-semibold text-theme-text">{{ resumenFuturos.totalProyectos }}</p>
          <p class="text-[11px] text-theme-text-sec">{{ resumenFuturos.totalDetalles }} det. · {{ resumenFuturos.totalOpciones }} opc.</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Promedio</p>
          <p class="mt-1 text-lg font-semibold text-sky-300">{{ currencySymbol }} {{ formatMonto(resumenFuturos.totalPromedio) }}</p>
          <p class="text-[11px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(resumenFuturos.totalMinimo) }} - {{ currencySymbol }} {{ formatMonto(resumenFuturos.totalMaximo) }}</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Por proy.</p>
          <p class="mt-1 text-lg font-semibold text-violet-300">{{ currencySymbol }} {{ formatMonto(resumenFuturos.promedioPorProyecto || 0) }}</p>
          <p class="text-[11px] text-theme-text-sec">promedio</p>
        </div>
      </div>

      <!-- Ahorro potencial -->
      <div v-if="ahorroPotencial > 0" class="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2.5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-[0.16em] text-emerald-300/70">Ahorro potencial</p>
              <p class="text-[11px] text-theme-text-sec">Eligiendo las opciones mas baratas</p>
            </div>
          </div>
          <p class="shrink-0 text-sm font-semibold text-emerald-400">{{ currencySymbol }} {{ formatMonto(ahorroPotencial) }}</p>
        </div>
      </div>

      <!-- Progreso de decision global -->
      <div v-if="resumenFuturos.progresoDecision?.total > 0" class="rounded-xl border border-theme-border bg-theme-input p-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Progreso de decision</p>
          <span class="text-[11px] font-semibold" :class="resumenFuturos.progresoDecision.porcentaje === 100 ? 'text-emerald-400' : 'text-sky-300'">
            {{ resumenFuturos.progresoDecision.decididos }} / {{ resumenFuturos.progresoDecision.total }} detalles
            · {{ resumenFuturos.progresoDecision.porcentaje }}%
          </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-theme-card">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="resumenFuturos.progresoDecision.porcentaje === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'"
            :style="{ width: resumenFuturos.progresoDecision.porcentaje + '%' }"
          ></div>
        </div>
        <!-- Desglose de decisiones -->
        <div v-if="desglose.compradas > 0 || desglose.planificadas > 0" class="mt-2.5 flex items-center gap-3">
          <div v-if="desglose.compradas > 0" class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span class="text-[10px] text-emerald-400">{{ desglose.compradas }} comprada{{ desglose.compradas > 1 ? 's' : '' }}</span>
          </div>
          <div v-if="desglose.planificadas > 0" class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-sky-400"></span>
            <span class="text-[10px] text-sky-300">{{ desglose.planificadas }} planificada{{ desglose.planificadas > 1 ? 's' : '' }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-gray-500"></span>
            <span class="text-[10px] text-theme-text-muted">{{ desglose.pendientes }} pendiente{{ desglose.pendientes > 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <!-- Distribucion por prioridad -->
      <div v-if="resumenFuturos.totalProyectos > 0 && resumenFuturos.porPrioridad" class="rounded-xl border border-theme-border bg-theme-input p-3">
        <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted mb-2">Por prioridad</p>
        <div class="flex gap-2">
          <div v-if="resumenFuturos.porPrioridad.alta" class="flex items-center gap-1.5 rounded-full bg-red-500/12 px-2.5 py-1">
            <span class="h-2 w-2 rounded-full bg-red-400"></span>
            <span class="text-[11px] font-medium text-red-400">{{ resumenFuturos.porPrioridad.alta }} alta{{ resumenFuturos.porPrioridad.alta > 1 ? 's' : '' }}</span>
          </div>
          <div v-if="resumenFuturos.porPrioridad.media" class="flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1">
            <span class="h-2 w-2 rounded-full bg-amber-400"></span>
            <span class="text-[11px] font-medium text-amber-300">{{ resumenFuturos.porPrioridad.media }} media{{ resumenFuturos.porPrioridad.media > 1 ? 's' : '' }}</span>
          </div>
          <div v-if="resumenFuturos.porPrioridad.baja" class="flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span class="text-[11px] font-medium text-emerald-400">{{ resumenFuturos.porPrioridad.baja }} baja{{ resumenFuturos.porPrioridad.baja > 1 ? 's' : '' }}</span>
          </div>
          <div v-if="resumenFuturos.porPrioridad.sinDefinir" class="flex items-center gap-1.5 rounded-full bg-theme-card px-2.5 py-1">
            <span class="h-2 w-2 rounded-full bg-gray-500"></span>
            <span class="text-[11px] font-medium text-theme-text-sec">{{ resumenFuturos.porPrioridad.sinDefinir }} sin def.</span>
          </div>
        </div>
      </div>

      <!-- Proyecto mas caro -->
      <div v-if="resumenFuturos.proyectoMasCaro && resumenFuturos.totalProyectos > 1" class="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-[0.16em] text-amber-300/70">Proyecto mas costoso</p>
            <p class="mt-0.5 truncate text-sm font-medium text-theme-text">
              {{ resumenFuturos.proyectoMasCaro.categoriaIcono || '' }} {{ resumenFuturos.proyectoMasCaro.tipoGasto }}
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-sm font-semibold text-amber-300">{{ currencySymbol }} {{ formatMonto(resumenFuturos.proyectoMasCaro.totalPromedio) }}</p>
            <p v-if="resumenFuturos.totalPromedio > 0" class="text-[10px] text-amber-300/60">{{ Math.round((resumenFuturos.proyectoMasCaro.totalPromedio / resumenFuturos.totalPromedio) * 100) }}% del total</p>
          </div>
        </div>
      </div>

      <!-- Por categoria con barras proporcionales -->
      <div v-if="resumenFuturos.porCategoria?.length > 1" class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Por categoria</p>
        <div class="space-y-1.5">
          <div
            v-for="cat in resumenFuturos.porCategoria"
            :key="cat.nombre"
            class="rounded-lg bg-theme-input/60 px-3 py-2"
          >
            <div class="flex items-center justify-between gap-3 mb-1.5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm">{{ cat.icono || '📦' }}</span>
                <span class="truncate text-xs text-theme-text">{{ cat.nombre }}</span>
                <span class="shrink-0 rounded-full bg-theme-card px-1.5 py-0.5 text-[10px] text-theme-text-muted">{{ cat.cantidad }}</span>
              </div>
              <span class="shrink-0 text-xs font-medium text-sky-300">{{ currencySymbol }} {{ formatMonto(cat.totalPromedio) }}</span>
            </div>
            <div class="h-1 w-full overflow-hidden rounded-full bg-theme-card">
              <div
                class="h-full rounded-full bg-gradient-to-r from-sky-500/60 to-sky-400/60 transition-all duration-500"
                :style="{ width: barraCategoria(cat.totalPromedio) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Destacados -->
      <div v-if="resumenFuturos.destacados.length" class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-theme-text">Ultimos actualizados</p>
        </div>
        <div class="space-y-2">
          <div
            v-for="destacado in resumenFuturos.destacados"
            :key="destacado.id"
            class="rounded-xl border border-theme-border bg-theme-input/80 px-3 py-2.5"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="truncate text-sm font-medium text-theme-text">{{ destacado.tipoGasto }}</p>
                  <span
                    v-if="destacado.prioridad === 3"
                    class="shrink-0 h-2 w-2 rounded-full bg-red-400"
                    title="Alta"
                  ></span>
                  <span
                    v-else-if="destacado.prioridad === 2"
                    class="shrink-0 h-2 w-2 rounded-full bg-amber-400"
                    title="Media"
                  ></span>
                </div>
                <p class="truncate text-[11px] text-theme-text-sec">
                  {{ destacado.categoriaNombre || 'Sin categoria' }} · {{ destacado.totalDetalles }} detalles · {{ destacado.totalOpciones }} opciones
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-xs font-semibold text-sky-300">{{ currencySymbol }} {{ formatMonto(destacado.totalPromedio) }}</p>
                <p class="text-[10px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(destacado.totalMinimo) }} - {{ currencySymbol }} {{ formatMonto(destacado.totalMaximo) }}</p>
              </div>
            </div>
            <div v-if="destacado.detalles.length" class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="detalle in destacado.detalles"
                :key="detalle"
                class="rounded-full bg-theme-card px-2 py-1 text-[10px] text-theme-text-sec"
              >
                {{ detalle }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="rounded-xl border border-dashed border-theme-border bg-theme-input/70 px-4 py-5 text-center">
        <p class="text-sm text-theme-text">Aun no tienes proyectos futuros</p>
        <p class="mt-1 text-xs text-theme-text-sec">Crea uno para comparar alternativas como una PC nueva, ropa o equipamiento.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { resumenFuturos, gastosFuturos } = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()

const ahorroPotencial = computed(() => {
  const max = resumenFuturos.value.totalMaximo || 0
  const min = resumenFuturos.value.totalMinimo || 0
  return max > min ? Math.round((max - min + Number.EPSILON) * 100) / 100 : 0
})

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

const maxCategoria = computed(() => {
  const cats = resumenFuturos.value.porCategoria || []
  if (!cats.length) return 1
  return Math.max(...cats.map(c => c.totalPromedio || 0), 1)
})

function barraCategoria(totalPromedio) {
  return Math.max(Math.round(((totalPromedio || 0) / maxCategoria.value) * 100), 2)
}
</script>
