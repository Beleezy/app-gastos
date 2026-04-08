<template>
  <div class="px-4 py-2">
    <!-- Sub-tabs: Comparar / Tendencia -->
    <div class="flex gap-2 mb-4">
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vista === 'comparar' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
        @click="vista = 'comparar'"
      >
        Comparar
      </button>
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vista === 'tendencia' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
        @click="vista = 'tendencia'"
      >
        Tendencia
      </button>
    </div>

    <!-- ===== VISTA COMPARAR ===== -->
    <div v-if="vista === 'comparar'">
      <!-- Selector de mes a comparar -->
      <div class="mb-4">
        <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Comparar con:</p>
        <div class="flex items-center gap-1.5">
          <button
            v-for="m in mesesRecientes"
            :key="m.key"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
            :class="m.key === mesComparar ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-primary-800/50 text-gray-500 border-primary-700/20 hover:text-gray-300'"
            @click="seleccionarMes(m)"
          >
            {{ m.label }}
          </button>
          <!-- Select para meses anteriores -->
          <select
            class="px-2 py-1.5 rounded-lg text-xs font-medium border bg-primary-800/50 text-gray-400 border-primary-700/20 outline-none cursor-pointer appearance-none"
            :class="mesComparEsAntiguo ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : ''"
            :value="mesComparEsAntiguo ? mesComparar : ''"
            @change="onSelectMesAntiguo($event)"
          >
            <option value="" disabled>Más...</option>
            <option
              v-for="m in mesesAntiguos"
              :key="m.key"
              :value="m.key"
            >
              {{ m.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Totales -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-primary-800/80 rounded-xl p-3 border border-primary-700/20">
          <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Este mes</p>
          <p class="text-lg font-bold text-white">{{ currencySymbol }} {{ formatMonto(totalActual) }}</p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ mesActualLabel }}</p>
        </div>
        <div class="bg-primary-800/80 rounded-xl p-3 border border-primary-700/20">
          <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mes comparado</p>
          <p class="text-lg font-bold text-gray-400">
            <span v-if="isLoadingComparar">
              <span class="inline-block w-20 h-5 bg-primary-700 rounded animate-pulse"></span>
            </span>
            <span v-else>{{ currencySymbol }} {{ formatMonto(totalComparar) }}</span>
          </p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ mesCompararLabel }}</p>
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

      <!-- Loading por categoría -->
      <div v-if="isLoadingComparar" class="space-y-2">
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
                <span class="text-[9px] text-gray-600 w-14 shrink-0 truncate">{{ mesActualLabel.split(' ')[0] }}</span>
                <div class="flex-1 h-1.5 bg-primary-900/60 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500" :style="{ width: cat.barActual + '%', backgroundColor: cat.color }"></div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[9px] text-gray-600 w-14 shrink-0 truncate">{{ mesCompararLabel.split(' ')[0] }}</span>
                <div class="flex-1 h-1.5 bg-primary-900/60 rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-gray-600 transition-all duration-500" :style="{ width: cat.barComparar + '%' }"></div>
                </div>
                <span class="text-[9px] text-gray-600 shrink-0">{{ currencySymbol }} {{ formatMonto(cat.comparar) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== VISTA TENDENCIA ===== -->
    <div v-if="vista === 'tendencia'">
      <!-- Selector cantidad de meses -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-[10px] text-gray-500 uppercase tracking-wider">Últimos meses</p>
        <div class="flex gap-1">
          <button
            v-for="n in [3, 6, 12]"
            :key="n"
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border"
            :class="cantidadMeses === n ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-primary-800/50 text-gray-500 border-primary-700/20'"
            @click="cantidadMeses = n"
          >
            {{ n }}m
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingTendencia" class="space-y-2">
        <div v-for="i in 6" :key="i" class="bg-primary-800 rounded-xl h-10 animate-pulse"></div>
      </div>

      <div v-else>
        <!-- Gráfico de barras horizontales -->
        <div class="space-y-2 mb-5">
          <div
            v-for="m in tendenciaOrdenada"
            :key="m.key"
            class="bg-primary-800/60 rounded-xl px-3 py-2.5 border border-primary-700/20"
            :class="m.esActual ? 'border-blue-500/30 bg-blue-500/5' : ''"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium" :class="m.esActual ? 'text-blue-300' : 'text-gray-400'">
                  {{ m.label }}
                </span>
                <span v-if="m.esActual" class="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full">actual</span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Variación vs mes anterior -->
                <span v-if="m.variacion !== null" class="text-[10px]" :class="m.variacion > 0 ? 'text-red-400' : m.variacion < 0 ? 'text-emerald-400' : 'text-gray-600'">
                  {{ m.variacion > 0 ? '▲' : m.variacion < 0 ? '▼' : '─' }} {{ Math.abs(m.variacion).toFixed(0) }}%
                </span>
                <span class="text-xs font-semibold text-white">{{ currencySymbol }} {{ formatMonto(m.total) }}</span>
              </div>
            </div>
            <div class="flex-1 h-2 bg-primary-900/60 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="m.esActual ? 'bg-blue-500' : 'bg-gray-600'"
                :style="{ width: m.barPct + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Promedio y máximo -->
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-primary-800/60 rounded-xl p-3 border border-primary-700/20 text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Promedio</p>
            <p class="text-sm font-bold text-white">{{ currencySymbol }} {{ formatMonto(promedioTendencia) }}</p>
          </div>
          <div class="bg-primary-800/60 rounded-xl p-3 border border-primary-700/20 text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Máximo</p>
            <p class="text-sm font-bold text-red-400">{{ currencySymbol }} {{ formatMonto(maxTendencia) }}</p>
          </div>
          <div class="bg-primary-800/60 rounded-xl p-3 border border-primary-700/20 text-center">
            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mínimo</p>
            <p class="text-sm font-bold text-emerald-400">{{ currencySymbol }} {{ formatMonto(minTendencia) }}</p>
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

// ─── Sub-vista ──────────────────────────────────────────────
const vista = ref('comparar')

// ─── Lista de meses disponibles (últimos 24 meses, excluyendo el actual) ─
const mesesDisponibles = computed(() => {
  const lista = []
  let m = props.mesActual
  let a = props.anioActual
  for (let i = 0; i < 24; i++) {
    m--
    if (m === 0) { m = 12; a-- }
    lista.push({
      key: `${a}-${m}`,
      mes: m,
      anio: a,
      label: `${MESES[m - 1].slice(0, 3)} ${a}`,
    })
  }
  return lista
})

// Últimos 3 meses como botones rápidos
const mesesRecientes = computed(() => mesesDisponibles.value.slice(0, 3))
// El resto como opciones del select
const mesesAntiguos = computed(() => mesesDisponibles.value.slice(3))

// Mes comparar seleccionado (por defecto: mes anterior)
const mesComparar = ref('')
const mesCompararObj = ref(null)

// Indica si el mes seleccionado está en la lista de antiguos (select)
const mesComparEsAntiguo = computed(() =>
  mesesAntiguos.value.some(m => m.key === mesComparar.value)
)

function seleccionarMes(m) {
  mesComparar.value = m.key
  mesCompararObj.value = m
  fetchGastosComparar(m.mes, m.anio)
}

function onSelectMesAntiguo(event) {
  const key = event.target.value
  if (!key) return
  const m = mesesAntiguos.value.find(x => x.key === key)
  if (m) seleccionarMes(m)
}

// ─── VISTA COMPARAR ─────────────────────────────────────────
const isLoadingComparar = ref(false)
const gastosComparar = ref([])

async function fetchGastosComparar(mes, anio) {
  isLoadingComparar.value = true
  try {
    gastosComparar.value = await $fetch('/api/gastos', { query: { mes, anio } })
  } catch { /* silently */ }
  finally { isLoadingComparar.value = false }
}

const mesActualLabel = computed(() => `${MESES[props.mesActual - 1]} ${props.anioActual}`)
const mesCompararLabel = computed(() => mesCompararObj.value
  ? `${MESES[mesCompararObj.value.mes - 1]} ${mesCompararObj.value.anio}`
  : '—'
)

const totalActual = computed(() => props.gastosActuales.reduce((s, g) => s + g.monto, 0))
const totalComparar = computed(() => gastosComparar.value.reduce((s, g) => s + g.monto, 0))
const diferencia = computed(() => totalActual.value - totalComparar.value)
const porcentajeDiferencia = computed(() => {
  if (totalComparar.value === 0) return totalActual.value > 0 ? '∞' : '0'
  return ((diferencia.value / totalComparar.value) * 100).toFixed(1)
})

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
  const cmpMap = agrupar(gastosComparar.value)
  const nombres = new Set([...Object.keys(actMap), ...Object.keys(cmpMap)])

  const maxTotal = Math.max(
    ...Array.from(nombres).map(n => Math.max(actMap[n]?.total || 0, cmpMap[n]?.total || 0))
  ) || 1

  return Array.from(nombres)
    .map(nombre => {
      const actual = actMap[nombre]?.total || 0
      const comparar = cmpMap[nombre]?.total || 0
      return {
        nombre,
        color: actMap[nombre]?.color || cmpMap[nombre]?.color || '#6b7280',
        actual,
        comparar,
        diff: actual - comparar,
        barActual: (actual / maxTotal) * 100,
        barComparar: (comparar / maxTotal) * 100,
      }
    })
    .sort((a, b) => b.actual - a.actual)
})

// ─── VISTA TENDENCIA ─────────────────────────────────────────
const cantidadMeses = ref(6)
const isLoadingTendencia = ref(false)
const datosTendencia = ref([])

async function fetchTendencia() {
  isLoadingTendencia.value = true
  datosTendencia.value = []
  try {
    const lista = []
    let m = props.mesActual
    let a = props.anioActual
    // Incluir mes actual + (cantidadMeses - 1) anteriores
    for (let i = 0; i < cantidadMeses.value; i++) {
      lista.push({ mes: m, anio: a, key: `${a}-${m}`, label: `${MESES[m - 1].slice(0, 3)} ${a}`, esActual: i === 0 })
      m--
      if (m === 0) { m = 12; a-- }
    }

    const resultados = await Promise.all(
      lista.map(item =>
        $fetch('/api/gastos/resumen', { query: { mes: item.mes, anio: item.anio } })
          .then(r => ({ ...item, total: parseFloat(r.totalMes) || 0 }))
          .catch(() => ({ ...item, total: 0 }))
      )
    )

    // Ordenar cronológicamente (más antiguo primero)
    datosTendencia.value = resultados.reverse()
  } finally {
    isLoadingTendencia.value = false
  }
}

const tendenciaOrdenada = computed(() => {
  const maxTotal = Math.max(...datosTendencia.value.map(m => m.total)) || 1
  return datosTendencia.value.map((m, i) => {
    const anterior = datosTendencia.value[i - 1]
    let variacion = null
    if (anterior && anterior.total > 0) {
      variacion = ((m.total - anterior.total) / anterior.total) * 100
    }
    return {
      ...m,
      barPct: (m.total / maxTotal) * 100,
      variacion,
    }
  })
})

const promedioTendencia = computed(() => {
  if (!datosTendencia.value.length) return 0
  const sum = datosTendencia.value.reduce((s, m) => s + m.total, 0)
  return sum / datosTendencia.value.length
})

const maxTendencia = computed(() => Math.max(...datosTendencia.value.map(m => m.total), 0))
const minTendencia = computed(() => {
  const valores = datosTendencia.value.map(m => m.total)
  return valores.length ? Math.min(...valores) : 0
})

// ─── Inicialización ─────────────────────────────────────────
function init() {
  // Seleccionar mes anterior por defecto
  if (mesesDisponibles.value.length) {
    const primero = mesesDisponibles.value[0]
    mesComparar.value = primero.key
    mesCompararObj.value = primero
    fetchGastosComparar(primero.mes, primero.anio)
  }
  fetchTendencia()
}

watch([() => props.mesActual, () => props.anioActual], init)
watch(cantidadMeses, fetchTendencia)

onMounted(init)
</script>
