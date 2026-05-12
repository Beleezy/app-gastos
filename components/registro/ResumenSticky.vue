<template>
  <Transition name="slide-down">
    <div
      v-if="visible"
      class="lg:hidden px-3 pb-2 border-b border-theme-border bg-theme-card"
    >
      <div
        class="relative max-w-lg mx-auto bg-theme-input/40 border border-theme-border rounded-xl px-4 py-2 overflow-hidden"
      >
        <!-- Glow decorativo -->
        <div
          class="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-colors duration-500"
          :class="excedido ? 'bg-red-500/10' : porcentaje > 70 ? 'bg-amber-500/10' : 'bg-theme-accent-bg'"
        ></div>

        <!-- Fila 1: chip mes + navegacion -->
        <div class="relative flex items-center justify-between mb-1">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-md bg-theme-input/60 border border-theme-border text-[0.6rem] uppercase tracking-wider font-semibold text-theme-text-sec"
          >
            {{ mesLabel }}
          </span>
          <div class="flex items-center gap-1">
            <button
              class="w-7 h-7 rounded-lg bg-theme-input/60 border border-theme-border flex items-center justify-center text-theme-text-muted active:bg-theme-border-md active:scale-95 transition-all"
              aria-label="Mes anterior"
              @click="$emit('prev')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              class="w-7 h-7 rounded-lg bg-theme-input/60 border border-theme-border flex items-center justify-center text-theme-text-muted active:bg-theme-border-md active:scale-95 transition-all"
              :class="disableNext ? 'opacity-40 cursor-not-allowed' : ''"
              :disabled="disableNext"
              aria-label="Mes siguiente"
              @click="$emit('next')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Fila 2: monto prominente + meta -->
        <div class="relative flex items-end justify-between gap-3">
          <p
            class="text-2xl font-bold leading-none tabular-nums"
            :class="excedido ? 'text-red-400' : 'text-gradient-blue'"
          >
            {{ currencySymbol }} {{ formatMonto(totalMes) }}
          </p>
          <p v-if="presupuesto > 0" class="text-[0.7rem] text-theme-text-sec leading-tight text-right">
            de {{ currencySymbol }} {{ formatMonto(presupuesto) }}
            <span class="block font-semibold" :class="excedido ? 'text-red-400' : 'text-emerald-400'">
              {{ excedido ? '+' : '' }}{{ formatMonto(Math.abs(saldo)) }} {{ excedido ? 'excedido' : 'restante' }}
            </span>
          </p>
          <p v-else class="text-[0.7rem] text-theme-text-muted italic">Sin presupuesto</p>
        </div>

        <!-- Barra de progreso -->
        <div v-if="presupuesto > 0" class="relative mt-2">
          <div class="w-full h-1 bg-theme-input rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="excedido
                ? 'bg-gradient-to-r from-red-500 to-rose-400'
                : porcentaje > 70
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
              :style="{ width: Math.min(porcentaje, 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  mesLabel: { type: String, required: true },
  totalMes: { type: Number, default: 0 },
  presupuesto: { type: Number, default: 0 },
  disableNext: { type: Boolean, default: false },
})

defineEmits(['prev', 'next'])

const { currencySymbol, formatMonto } = useCurrency()

const saldo = computed(() => props.presupuesto - props.totalMes)
const excedido = computed(() => props.presupuesto > 0 && saldo.value < 0)
const porcentaje = computed(() => {
  if (props.presupuesto <= 0) return 0
  return (props.totalMes / props.presupuesto) * 100
})
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.25s ease;
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
