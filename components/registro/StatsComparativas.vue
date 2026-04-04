<template>
  <div class="px-4 py-2">
    <!-- Totales del mes -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-primary-800/80 rounded-xl p-3 border border-primary-700/20">
        <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Este mes</p>
        <p class="text-lg font-bold text-white">{{ currencySymbol }} {{ formatMonto(totalActual) }}</p>
        <p class="text-[10px] text-gray-500 mt-0.5">{{ mesActualLabel }}</p>
      </div>
      <div class="bg-primary-800/80 rounded-xl p-3 border border-primary-700/20">
        <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mes anterior</p>
        <p class="text-lg font-bold text-gray-400">{{ currencySymbol }} {{ formatMonto(totalAnterior) }}</p>
        <p class="text-[10px] text-gray-500 mt-0.5">{{ mesAnteriorLabel }}</p>
      </div>
    </div>

    <!-- Diferencia global -->
    <div
      class="flex items-center justify-between px-4 py-3 rounded-xl mb-4 border"
      :class="diferencia > 0 ? 'bg-red-500/8 border-red-500/15' : diferencia < 0 ? 'bg-emerald-500/8 border-emerald-500/15' : 'bg-primary-800/40 border-primary-700/20'"
    >
      <span class="text-sm text-gray-400">Variación total</span>
      <div class="flex items-center gap-1.5">
        <svg v-if="diferencia > 0" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
        <svg v-else-if="diferencia < 0" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
        <span
          class="text-sm font-semibold"
          :class="diferencia > 0 ? 'text-red-400' : diferencia < 0 ? 'text-emerald-400' : 'text-gray-400'"
        >
          {{ diferencia > 0 ? '+' : '' }}{{ currencySymbol }} {{ formatMonto(Math.abs(diferencia)) }}
          <span class="text-xs font-normal ml-1">({{ porcentajeDiferencia }}%)</span>
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="bg-primary-800 rounded-xl h-12 animate-pulse"></div>
    </div>

    <!-- Comparativa por categoría -->
    <div v-else>
      <p class="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Por categoría</p>
      <div class="space-y-2">
        <div
          v-for="cat in categoriasComparadas"
          :key="cat.nombre"
          class="bg-primary-800/60 rounded-xl px-3 py-2.5 border border-primary-700/20"
        >
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: cat.color }"></span>
              <span class="text-xs text-gray-300 font-medium">{{ cat.nombre }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <!-- Trend icon -->
              <svg v-if="cat.diff > 0" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              <svg v-else-if="cat.diff < 0" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              <span class="w-3 h-3" v-else></span>
              <span class="text-xs font-semibold" :class="cat.diff > 0 ? 'text-red-400' : cat.diff < 0 ? 'text-emerald-400' : 'text-gray-500'">
                {{ currencySymbol }} {{ formatMonto(cat.actual) }}
              </span>
            </div>
          </div>
          <!-- Barras comparativas -->
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[9px] text-gray-600 w-14 shrink-0">Este mes</span>
              <div class="flex-1 h-1.5 bg-primary-900/60 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" :style="{ width: cat.barActual + '%', backgroundColor: cat.color }"></div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] text-gray-600 w-14 shrink-0">Mes ant.</span>
              <div class="flex-1 h-1.5 bg-primary-900/60 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-gray-600 transition-all duration-500" :style="{ width: cat.barAnterior + '%' }"></div>
              </div>
              <span class="text-[9px] text-gray-600 shrink-0">{{ currencySymbol }} {{ formatMonto(cat.anterior) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="h-20"></div>
  </div>
</template>

<script setup>
import { MESES } from '~/utils/constants'

const props = defineProps({
  mesActual: { type: Number, required: true },
  anioActual: { type: Number, required: true },
  gastosActuales: { type: Array, default: () => [] },
})

const { currencySymbol, formatMonto } = useCurrency()
const isLoading = ref(false)
const gastosAnteriores = ref([])

const mesAnteriorNum = computed(() => props.mesActual === 1 ? 12 : props.mesActual - 1)
const anioAnteriorNum = computed(() => props.mesActual === 1 ? props.anioActual - 1 : props.anioActual)

const mesActualLabel = computed(() => `${MESES[props.mesActual - 1]} ${props.anioActual}`)
const mesAnteriorLabel = computed(() => `${MESES[mesAnteriorNum.value - 1]} ${anioAnteriorNum.value}`)

async function fetchAnterior() {
  isLoading.value = true
  try {
    gastosAnteriores.value = await $fetch('/api/gastos', {
      query: { mes: mesAnteriorNum.value, anio: anioAnteriorNum.value }
    })
  } catch { /* silently fail */ }
  finally { isLoading.value = false }
}

// Totales
const totalActual = computed(() => props.gastosActuales.reduce((s, g) => s + g.monto, 0))
const totalAnterior = computed(() => gastosAnteriores.value.reduce((s, g) => s + g.monto, 0))
const diferencia = computed(() => totalActual.value - totalAnterior.value)
const porcentajeDiferencia = computed(() => {
  if (totalAnterior.value === 0) return totalActual.value > 0 ? '∞' : '0'
  return ((diferencia.value / totalAnterior.value) * 100).toFixed(1)
})

// Agrupación por categoría para los dos meses
function agrupar(gastos) {
  const map = {}
  for (const g of gastos) {
    const key = g.categoriaNombre || 'Otros'
    if (!map[key]) map[key] = { total: 0, color: g.categoriaColor || '#6b7280' }
    map[key].total += g.monto
  }
  return map
}

const categoriasComparadas = computed(() => {
  const actMap = agrupar(props.gastosActuales)
  const antMap = agrupar(gastosAnteriores.value)
  const nombres = new Set([...Object.keys(actMap), ...Object.keys(antMap)])

  const maxTotal = Math.max(
    ...Array.from(nombres).map(n => Math.max(actMap[n]?.total || 0, antMap[n]?.total || 0))
  ) || 1

  return Array.from(nombres)
    .map(nombre => {
      const actual = actMap[nombre]?.total || 0
      const anterior = antMap[nombre]?.total || 0
      return {
        nombre,
        color: actMap[nombre]?.color || antMap[nombre]?.color || '#6b7280',
        actual,
        anterior,
        diff: actual - anterior,
        barActual: (actual / maxTotal) * 100,
        barAnterior: (anterior / maxTotal) * 100,
      }
    })
    .sort((a, b) => b.actual - a.actual)
})

watch([() => props.mesActual, () => props.anioActual], fetchAnterior, { immediate: true })
</script>
