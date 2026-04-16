<template>
  <div class="px-4 pt-4 pb-2">
    <div class="relative overflow-hidden rounded-2xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/90 p-4 space-y-4">
      <div class="absolute -top-10 right-0 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl"></div>

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
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Proyectos</p>
          <p class="mt-1 text-lg font-semibold text-theme-text">{{ resumenFuturos.totalProyectos }}</p>
          <p class="text-[11px] text-theme-text-sec">{{ resumenFuturos.totalDetalles }} detalles · {{ resumenFuturos.totalOpciones }} opciones</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Promedio total</p>
          <p class="mt-1 text-lg font-semibold text-sky-300">{{ currencySymbol }} {{ formatMonto(resumenFuturos.totalPromedio) }}</p>
          <p class="text-[11px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(resumenFuturos.totalMinimo) }} - {{ currencySymbol }} {{ formatMonto(resumenFuturos.totalMaximo) }}</p>
        </div>
      </div>

      <!-- Progreso de decision global -->
      <div v-if="resumenFuturos.progresoDecision?.total > 0" class="rounded-xl border border-theme-border bg-theme-input p-3">
        <div class="flex items-center justify-between mb-1.5">
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
          <p class="shrink-0 text-sm font-semibold text-amber-300">{{ currencySymbol }} {{ formatMonto(resumenFuturos.proyectoMasCaro.totalPromedio) }}</p>
        </div>
      </div>

      <!-- Por categoria -->
      <div v-if="resumenFuturos.porCategoria?.length > 1" class="space-y-2">
        <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Por categoria</p>
        <div class="space-y-1.5">
          <div
            v-for="cat in resumenFuturos.porCategoria"
            :key="cat.nombre"
            class="flex items-center justify-between gap-3 rounded-lg bg-theme-input/60 px-3 py-2"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm">{{ cat.icono || '📦' }}</span>
              <span class="truncate text-xs text-theme-text">{{ cat.nombre }}</span>
              <span class="shrink-0 rounded-full bg-theme-card px-1.5 py-0.5 text-[10px] text-theme-text-muted">{{ cat.cantidad }}</span>
            </div>
            <span class="shrink-0 text-xs font-medium text-sky-300">{{ currencySymbol }} {{ formatMonto(cat.totalPromedio) }}</span>
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
const { resumenFuturos } = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()
</script>
