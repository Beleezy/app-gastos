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

      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Proyectos</p>
          <p class="mt-1 text-lg font-semibold text-theme-text">{{ resumenFuturos.totalProyectos }}</p>
          <p class="text-[11px] text-theme-text-sec">{{ resumenFuturos.totalDetalles }} detalles</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Opciones</p>
          <p class="mt-1 text-lg font-semibold text-theme-text">{{ resumenFuturos.totalOpciones }}</p>
          <p class="text-[11px] text-theme-text-sec">{{ resumenFuturos.proyectosConReferencia }} con rango</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Minimo total</p>
          <p class="mt-1 text-sm font-semibold text-emerald-400">{{ currencySymbol }} {{ formatMonto(resumenFuturos.totalMinimo) }}</p>
          <p class="text-[11px] text-theme-text-sec">Escenario base</p>
        </div>
        <div class="rounded-xl border border-theme-border bg-theme-input p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-theme-text-muted">Promedio total</p>
          <p class="mt-1 text-sm font-semibold text-sky-300">{{ currencySymbol }} {{ formatMonto(resumenFuturos.totalPromedio) }}</p>
          <p class="text-[11px] text-theme-text-sec">Rango max: {{ currencySymbol }} {{ formatMonto(resumenFuturos.totalMaximo) }}</p>
        </div>
      </div>

      <div v-if="resumenFuturos.destacados.length" class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-theme-text">Resumen rapido</p>
          <p class="text-[11px] text-theme-text-sec">Ultimos actualizados</p>
        </div>
        <div class="space-y-2">
          <div
            v-for="destacado in resumenFuturos.destacados"
            :key="destacado.id"
            class="rounded-xl border border-theme-border bg-theme-input/80 px-3 py-2.5"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-theme-text">{{ destacado.tipoGasto }}</p>
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
