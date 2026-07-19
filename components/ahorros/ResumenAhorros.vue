<template>
  <div class="px-4 lg:px-0 pt-0 pb-2">
    <div
      class="relative bg-gradient-to-br from-theme-card to-theme-card/90 rounded-2xl px-4 pt-3 pb-4 space-y-4 border border-theme-border overflow-hidden"
    >
      <div
        class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"
      ></div>

      <!-- Selector de mes integrado -->
      <SharedMonthSelector
        :label="`${nombreMes} ${anioActual}`"
        :es-actual="esHoy"
        :show-current-label="false"
        class="relative"
        @prev="mesAnterior"
        @next="mesSiguiente"
        @go-to-current="fetchAhorros"
      />

      <div class="border-t border-theme-border"></div>

      <!-- Hero: este mes (grande) + total acumulado + metas -->
      <div class="relative flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-1">Este mes</p>
          <p
            class="text-2xl sm:text-3xl font-bold text-emerald-400 leading-tight whitespace-nowrap truncate"
          >
            {{ currencySymbol }}&nbsp;{{ formatMonto(totalMes) }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1.5 shrink-0">
          <div class="text-right">
            <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-0.5">
              Total acumulado
            </p>
            <p class="text-sm font-bold text-teal-400 whitespace-nowrap">
              {{ currencySymbol }}&nbsp;{{ formatMonto(totalGlobal) }}
            </p>
          </div>
          <button
            type="button"
            class="flex items-center gap-1 px-3 min-h-[2.5rem] rounded-lg bg-theme-accent-bg text-theme-accent text-[0.6875rem] font-medium hover:bg-theme-accent-bg-hover active:scale-95 transition-all border border-theme-accent/10"
            @click="$emit('abrir-metas')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Metas
          </button>
        </div>
      </div>

      <!-- Metas: barras compactas -->
      <div v-if="metaMensual || metaGlobal" class="space-y-2.5">
        <div v-if="metaMensual">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[0.6875rem] text-theme-text-muted uppercase tracking-wider"
              >Meta mensual</span
            >
            <span
              class="text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded-full"
              :class="
                progresoMensual >= 100
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : progresoMensual > 60
                    ? 'text-teal-400 bg-teal-500/10'
                    : 'text-orange-400 bg-orange-500/10'
              "
            >
              {{ progresoMensual?.toFixed(0) || 0 }}%
            </span>
          </div>
          <div class="relative w-full h-2 bg-theme-input rounded-full overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-teal-400"
              :style="{ width: Math.min(progresoMensual || 0, 100) + '%' }"
            ></div>
          </div>
        </div>

        <div v-if="metaGlobal">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[0.6875rem] text-theme-text-muted uppercase tracking-wider"
              >Meta global</span
            >
            <span
              class="text-[0.6875rem] font-semibold px-1.5 py-0.5 rounded-full"
              :class="
                progresoGlobal >= 100
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-theme-accent bg-theme-accent-bg'
              "
            >
              {{ progresoGlobal?.toFixed(0) || 0 }}%
            </span>
          </div>
          <div class="relative w-full h-2 bg-theme-input rounded-full overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[var(--color-accent-dark)] via-[var(--color-accent)] to-indigo-400"
              :style="{ width: Math.min(progresoGlobal || 0, 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Tabs integrados -->
      <div v-if="tabs?.length" class="relative flex items-center gap-2 pt-1">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors border"
          :class="
            modelValue === tab.value
              ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
              : 'bg-theme-input text-theme-text-sec border-theme-border'
          "
          @click="$emit('update:modelValue', tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  tabs: { type: Array, default: () => [] },
})
defineEmits(['abrir-metas', 'update:modelValue'])

const {
  anioActual,
  nombreMes,
  esHoy,
  totalMes,
  totalGlobal,
  metaMensual,
  metaGlobal,
  progresoMensual,
  progresoGlobal,
  mesSiguiente,
  mesAnterior,
  fetchAhorros,
} = useAhorros()

const { currencySymbol, formatMonto } = useCurrency()
</script>
