<template>
  <div class="px-4 lg:px-0 pt-2 lg:pt-0 pb-2">
    <SharedMonthSelector
      :label="`${nombreMes} ${anioActual}`"
      :es-actual="esHoy"
      class="mb-4"
      @prev="mesAnterior"
      @next="mesSiguiente"
      @go-to-current="fetchAhorros"
    />

    <div class="relative bg-gradient-to-br from-theme-card to-theme-card/90 rounded-2xl p-4 space-y-4 border border-theme-border overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

      <!-- Header -->
      <div class="relative flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 flex items-center justify-center">
            <span class="text-sm">💰</span>
          </div>
          <span class="text-sm text-theme-text-muted">Ahorros</span>
        </div>
        <button
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-theme-accent-bg text-theme-accent text-[10px] font-medium hover:bg-theme-accent-bg-hover active:scale-95 transition-all border border-theme-accent/10"
          @click="$emit('abrir-metas')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Metas
        </button>
      </div>

      <div class="border-t border-theme-border"></div>

      <!-- Stats Row -->
      <div class="relative grid grid-cols-2 gap-2">
        <div class="bg-theme-input rounded-xl p-3 border border-emerald-500/5">
          <p class="text-[10px] text-theme-text-sec mb-1 uppercase tracking-wider">Este mes</p>
          <p class="text-sm font-bold text-emerald-400 whitespace-nowrap">{{ currencySymbol }} {{ formatMonto(totalMes) }}</p>
        </div>
        <div class="bg-theme-input rounded-xl p-3 border border-teal-500/5">
          <p class="text-[10px] text-theme-text-sec mb-1 uppercase tracking-wider">Total acumulado</p>
          <p class="text-sm font-bold text-teal-400 whitespace-nowrap">{{ currencySymbol }} {{ formatMonto(totalGlobal) }}</p>
        </div>
      </div>

      <!-- Meta mensual progress -->
      <div v-if="metaMensual">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] text-theme-text-muted uppercase tracking-wider">Meta mensual</span>
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="progresoMensual >= 100 ? 'text-emerald-400 bg-emerald-500/10' : (progresoMensual > 60 ? 'text-teal-400 bg-teal-500/10' : 'text-orange-400 bg-orange-500/10')"
          >
            {{ progresoMensual?.toFixed(0) || 0 }}%
          </span>
        </div>
        <div class="relative w-full h-2.5 bg-theme-input rounded-full overflow-hidden">
          <div
            class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-teal-400"
            :style="{ width: (progresoMensual || 0) + '%' }"
          ></div>
        </div>
        <p class="text-[10px] text-theme-text-muted mt-1">
          {{ currencySymbol }} {{ formatMonto(totalMes) }} de {{ currencySymbol }} {{ formatMonto(metaMensual) }}
        </p>
      </div>

      <!-- Meta global progress -->
      <div v-if="metaGlobal">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] text-theme-text-muted uppercase tracking-wider">Meta global</span>
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="progresoGlobal >= 100 ? 'text-emerald-400 bg-emerald-500/10' : 'text-theme-accent bg-theme-accent-bg'"
          >
            {{ progresoGlobal?.toFixed(0) || 0 }}%
          </span>
        </div>
        <div class="relative w-full h-2.5 bg-theme-input rounded-full overflow-hidden">
          <div
            class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[var(--color-accent-dark)] via-[var(--color-accent)] to-indigo-400"
            :style="{ width: (progresoGlobal || 0) + '%' }"
          ></div>
        </div>
        <p class="text-[10px] text-theme-text-muted mt-1">
          {{ currencySymbol }} {{ formatMonto(totalGlobal) }} de {{ currencySymbol }} {{ formatMonto(metaGlobal) }}
        </p>
      </div>

      <!-- Conteo -->
      <div class="flex items-center gap-3 pt-1">
        <div class="flex items-center gap-1.5 bg-emerald-500/8 px-2 py-1 rounded-lg">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span class="text-[11px] text-theme-text-muted">Registros: <span class="text-emerald-400 font-semibold">{{ ahorrosList.length }}</span></span>
        </div>
        <div class="flex items-center gap-1.5 bg-teal-500/8 px-2 py-1 rounded-lg">
          <span class="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          <span class="text-[11px] text-theme-text-muted">Medios: <span class="text-teal-400 font-semibold">{{ porMedio.length }}</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['abrir-metas'])

const {
  mesActual, anioActual, nombreMes, esHoy,
  totalMes, totalGlobal, metaMensual, metaGlobal,
  progresoMensual, progresoGlobal, porMedio, ahorrosList,
  mesSiguiente, mesAnterior, fetchAhorros,
} = useAhorros()

const { currencySymbol, formatMonto } = useCurrency()
</script>
