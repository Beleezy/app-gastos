<template>
  <div class="relative bg-gradient-to-br from-primary-800/80 to-primary-800/60 rounded-2xl border border-primary-700/20 px-4 py-4 overflow-hidden">
    <div class="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/6 rounded-full blur-2xl"></div>

    <div class="relative flex items-end justify-between mb-3">
      <div>
        <p class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">Gastado este mes</p>
        <p class="text-2xl font-bold text-gradient-blue">{{ currencySymbol }} {{ formatMonto(totalMes) }}</p>
      </div>
      <div v-if="presupuesto > 0" class="text-right">
        <p class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">Presupuesto</p>
        <p class="text-base font-semibold text-gray-300">{{ currencySymbol }} {{ formatMonto(presupuesto) }}</p>
      </div>
    </div>

    <div v-if="presupuesto > 0" class="relative">
      <div class="w-full h-1.5 bg-primary-900/50 rounded-full overflow-hidden mb-2">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out"
          :class="porcentaje > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : porcentaje > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
          :style="{ width: Math.min(porcentaje, 100) + '%' }"
        ></div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full"
          :class="saldo >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'"
        >
          {{ saldo >= 0 ? 'Disponible' : 'Excedido' }}: {{ currencySymbol }} {{ formatMonto(Math.abs(saldo)) }}
        </span>
        <span class="text-[10px] text-gray-500 font-medium">{{ porcentaje.toFixed(0) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  totalMes: { type: Number, default: 0 },
  presupuesto: { type: Number, default: 0 },
})

const { currencySymbol, formatMonto } = useCurrency()

const porcentaje = computed(() => {
  if (props.presupuesto <= 0) return 0
  return (props.totalMes / props.presupuesto) * 100
})

const saldo = computed(() => props.presupuesto - props.totalMes)
</script>
