<template>
  <div class="px-4 lg:px-0 pb-2">
    <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-3">Últimos 6 meses</h3>
    <div v-if="maxSerie > 0" class="bg-theme-card rounded-2xl border border-theme-border p-4">
      <div class="flex items-end gap-2 h-32">
        <div
          v-for="item in serie6Meses"
          :key="`${item.anio}-${item.mes}`"
          class="flex-1 flex flex-col items-center gap-1"
        >
          <span class="text-[10px] text-theme-text-muted font-medium">
            {{ currencySymbol }} {{ formatCorto(item.total) }}
          </span>
          <div class="w-full flex justify-center">
            <div
              class="w-full max-w-[32px] rounded-t-lg transition-all duration-500"
              :class="esActual(item) ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-theme-border-md'"
              :style="{ height: altura(item.total) + 'px', minHeight: item.total > 0 ? '4px' : '2px' }"
            ></div>
          </div>
          <span class="text-[9px] text-theme-text-sec">{{ MESES_CORTO[item.mes - 1] }}</span>
        </div>
      </div>
    </div>

    <div v-else class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center">
      <p class="text-sm text-theme-text-muted">Sin datos de ahorros aún</p>
    </div>
  </div>
</template>

<script setup>
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const { serie6Meses, mesActual, anioActual } = useAhorros()
const { currencySymbol } = useCurrency()

const maxSerie = computed(() => Math.max(...serie6Meses.value.map(s => s.total), 0))

function altura(total) {
  if (maxSerie.value <= 0) return 2
  return Math.max(2, (total / maxSerie.value) * 96)
}

function esActual(item) {
  return item.mes === mesActual.value && item.anio === anioActual.value
}

function formatCorto(valor) {
  if (valor >= 1000) return (valor / 1000).toFixed(1) + 'k'
  return valor.toFixed(0)
}
</script>
