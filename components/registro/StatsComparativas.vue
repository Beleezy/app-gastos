<template>
  <div class="px-4 py-2">
    <!-- Sub-tabs: Resumen / Tendencia -->
    <div class="flex gap-2 mb-4">
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vista === 'comparar' ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
        @click="vista = 'comparar'"
      >
        Resumen
      </button>
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vista === 'tendencia' ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
        @click="vista = 'tendencia'"
      >
        Tendencia
      </button>
    </div>

    <!-- ===== VISTA COMPARAR ===== -->
    <div v-if="vista === 'comparar'">
      <!-- Insights automáticos -->
      <div v-if="insights.length > 0" class="mb-4 space-y-1.5">
        <div
          v-for="(ins, i) in insights"
          :key="i"
          class="flex items-start gap-2 px-3 py-2 rounded-xl border text-xs"
          :class="ins.tono === 'positivo' ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-300' : ins.tono === 'negativo' ? 'bg-red-500/8 border-red-500/20 text-red-300' : 'bg-theme-card border-theme-border text-theme-text-sec'"
        >
          <span class="text-sm leading-none mt-0.5">{{ ins.icono }}</span>
          <span class="flex-1 leading-snug">{{ ins.texto }}</span>
        </div>
      </div>

      <!-- Selector de mes a comparar -->
      <div class="mb-4">
        <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-2">Comparar con:</p>
        <!-- Carrusel con pr-4: a 380px con texto grande los chips se cortaban al borde -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 pr-8 scrollbar-hide scroll-fade-r">
          <button
            v-for="m in mesesRecientes"
            :key="m.key"
            class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
            :class="m.key === mesComparar ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-theme-card text-theme-text-sec border-theme-border hover:text-theme-text-sec'"
            @click="seleccionarMes(m)"
          >
            {{ m.label }}
          </button>
          <!-- Select para meses anteriores -->
          <select
            class="px-2 py-1.5 rounded-lg text-xs font-medium border bg-theme-card text-theme-text-muted border-theme-border outline-none cursor-pointer appearance-none"
            :class="mesComparEsAntiguo ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : ''"
            :value="mesComparEsAntiguo ? mesComparar : ''"
            @change="onSelectMesAntiguo($event)"
          >
            <option value="" disabled>Mes</option>
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
        <div class="bg-theme-card rounded-xl p-3 border border-theme-border">
          <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-1">Este mes</p>
          <p class="text-lg font-bold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(totalActual) }}</p>
          <p class="text-[0.6875rem] text-theme-text-sec mt-0.5">{{ mesActualLabel }}</p>
        </div>
        <div class="bg-theme-card rounded-xl p-3 border border-theme-border">
          <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-1">Mes comparado</p>
          <p class="text-lg font-bold text-theme-text-muted">
            <span v-if="isLoadingComparar">
              <span class="inline-block w-20 h-5 bg-theme-border-md rounded animate-pulse"></span>
            </span>
            <span v-else>{{ currencySymbol }}&nbsp;{{ formatMonto(totalComparar) }}</span>
          </p>
          <p class="text-[0.6875rem] text-theme-text-sec mt-0.5">{{ mesCompararLabel }}</p>
        </div>
      </div>

      <!-- Diferencia global -->
      <div
        class="flex items-center justify-between px-4 py-3 rounded-xl mb-4 border"
        :class="diferencia > 0 ? 'bg-red-500/8 border-red-500/15' : diferencia < 0 ? 'bg-emerald-500/8 border-emerald-500/15' : 'bg-theme-card border-theme-border'"
      >
        <span class="text-sm text-theme-text-muted">Variación total</span>
        <div class="flex items-center gap-1.5">
          <svg v-if="diferencia > 0" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          <svg v-else-if="diferencia < 0" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          <span
            class="text-sm font-semibold"
            :class="diferencia > 0 ? 'text-red-400' : diferencia < 0 ? 'text-emerald-400' : 'text-theme-text-muted'"
          >
            {{ diferencia > 0 ? '+' : '' }}{{ currencySymbol }}&nbsp;{{ formatMonto(Math.abs(diferencia)) }}
            <span class="text-xs font-normal ml-1">({{ porcentajeDiferencia }}%)</span>
          </span>
        </div>
      </div>

      <!-- Loading por categoría -->
      <div v-if="isLoadingComparar" class="space-y-2">
        <div v-for="i in 4" :key="i" class="bg-theme-card rounded-xl h-12 animate-pulse"></div>
      </div>

      <!-- Comparativa por categoría -->
      <div v-else>
        <p class="text-[0.6875rem] text-theme-text-muted uppercase tracking-wider font-semibold mb-2">Por categoría</p>
        <div class="space-y-2">
          <div
            v-for="cat in categoriasComparadas"
            :key="cat.nombre"
            class="bg-theme-card rounded-xl px-3 py-2.5 border border-theme-border"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: cat.color }"></span>
                <span class="text-xs text-theme-text-sec font-medium">{{ cat.nombre }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg v-if="cat.diff > 0" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
                <svg v-else-if="cat.diff < 0" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
                <span class="w-3 h-3" v-else></span>
                <span class="text-xs font-semibold" :class="cat.diff > 0 ? 'text-red-400' : cat.diff < 0 ? 'text-emerald-400' : 'text-theme-text-sec'">
                  {{ currencySymbol }}&nbsp;{{ formatMonto(cat.actual) }}
                </span>
              </div>
            </div>
            <!-- Barras comparativas -->
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-[0.6875rem] text-theme-text-muted w-14 shrink-0 truncate">{{ mesActualLabel.split(' ')[0] }}</span>
                <div class="flex-1 h-1.5 bg-theme-input rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500" :style="{ width: cat.barActual + '%', backgroundColor: cat.color }"></div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[0.6875rem] text-theme-text-muted w-14 shrink-0 truncate">{{ mesCompararLabel.split(' ')[0] }}</span>
                <div class="flex-1 h-1.5 bg-theme-input rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-gray-600 transition-all duration-500" :style="{ width: cat.barComparar + '%' }"></div>
                </div>
                <span class="text-[0.6875rem] text-theme-text-muted shrink-0">{{ currencySymbol }}&nbsp;{{ formatMonto(cat.comparar) }}</span>
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
        <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider">Últimos meses</p>
        <div class="flex gap-1">
          <button
            v-for="n in [3, 6, 12]"
            :key="n"
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border"
            :class="cantidadMeses === n ? 'bg-theme-accent-bg text-theme-accent border-theme-accent' : 'bg-theme-card text-theme-text-sec border-theme-border'"
            @click="cantidadMeses = n"
          >
            {{ n }}m
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingTendencia" class="space-y-2">
        <div v-for="i in 6" :key="i" class="bg-theme-card rounded-xl h-10 animate-pulse"></div>
      </div>

      <div v-else>
        <!-- Gráfico de barras horizontales -->
        <div class="space-y-2 mb-5">
          <div
            v-for="m in tendenciaOrdenada"
            :key="m.key"
            class="bg-theme-card rounded-xl px-3 py-2.5 border border-theme-border"
            :class="m.esActual ? 'border-theme-accent bg-theme-accent-bg' : ''"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium" :class="m.esActual ? 'text-theme-accent' : 'text-theme-text-muted'">
                  {{ m.label }}
                </span>
                <span v-if="m.esActual" class="text-[0.6875rem] bg-theme-accent-bg text-theme-accent border border-theme-accent px-1.5 py-0.5 rounded-full">actual</span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Variación vs mes anterior -->
                <span v-if="m.variacion !== null" class="text-[0.6875rem]" :class="m.variacion > 0 ? 'text-red-400' : m.variacion < 0 ? 'text-emerald-400' : 'text-theme-text-muted'">
                  {{ m.variacion > 0 ? '▲' : m.variacion < 0 ? '▼' : '─' }} {{ Math.abs(m.variacion).toFixed(0) }}%
                </span>
                <span class="text-xs font-semibold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(m.total) }}</span>
              </div>
            </div>
            <div class="flex-1 h-2 bg-theme-input rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="m.esActual ? 'bg-theme-accent' : 'bg-gray-600'"
                :style="{ width: m.barPct + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Máximo / Mínimo (arriba, lado a lado) + Promedio (abajo, full width) -->
        <div class="space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-theme-card rounded-xl p-3 border border-theme-border text-center">
              <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-1">Máximo</p>
              <p class="text-sm font-bold text-red-400">{{ currencySymbol }}&nbsp;{{ formatMonto(maxTendencia) }}</p>
            </div>
            <div class="bg-theme-card rounded-xl p-3 border border-theme-border text-center">
              <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-1">Mínimo</p>
              <p class="text-sm font-bold text-emerald-400">{{ currencySymbol }}&nbsp;{{ formatMonto(minTendencia) }}</p>
            </div>
          </div>
          <div class="bg-theme-card rounded-xl p-3 border border-theme-border flex items-center justify-between">
            <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider">Promedio</p>
            <p class="text-base font-bold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(promedioTendencia) }}</p>
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

// Helpers compartidos en useStatsComparativas (§4.5 / §11 planifica.md)
const stats = useStatsComparativas()
const totalActual = computed(() => stats.totalGastos(props.gastosActuales))
const totalComparar = computed(() => stats.totalGastos(gastosComparar.value))
const diferencia = computed(() => totalActual.value - totalComparar.value)
const porcentajeDiferencia = computed(() => {
  const pct = stats.porcentajeCambio(totalActual.value, totalComparar.value)
  if (pct == null) return totalActual.value > 0 ? '∞' : '0'
  return pct.toFixed(1)
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

// Insights automáticos — frases generadas de la comparación
const insights = computed(() => {
  const lista = []
  if (isLoadingComparar.value || !gastosComparar.value.length) return lista

  const pct = parseFloat(porcentajeDiferencia.value)
  if (!isNaN(pct) && totalComparar.value > 0) {
    if (pct >= 15) {
      lista.push({
        tono: 'negativo', icono: '📈',
        texto: `Gastaste ${pct.toFixed(0)}% más que en ${mesCompararLabel.value}.`,
      })
    } else if (pct <= -15) {
      lista.push({
        tono: 'positivo', icono: '📉',
        texto: `Gastaste ${Math.abs(pct).toFixed(0)}% menos que en ${mesCompararLabel.value}. ¡Buen control!`,
      })
    }
  }

  // Categoría con mayor crecimiento
  const cats = Object.values(agrupar(props.gastosActuales))
  const cmpCats = agrupar(gastosComparar.value)
  let maxCrec = null
  for (const [nombre, data] of Object.entries(agrupar(props.gastosActuales))) {
    const prev = cmpCats[nombre]?.total || 0
    if (prev > 0) {
      const crec = ((data.total - prev) / prev) * 100
      if (crec >= 25 && (!maxCrec || crec > maxCrec.crec)) {
        maxCrec = { nombre, crec, actual: data.total }
      }
    }
  }
  if (maxCrec) {
    lista.push({
      tono: 'negativo', icono: '⚠️',
      texto: `${maxCrec.nombre} subió ${maxCrec.crec.toFixed(0)}% este mes.`,
    })
  }

  // Días promedio de registro
  const fechasUnicas = new Set(props.gastosActuales.map(g => g.fecha))
  if (fechasUnicas.size > 0 && cats.length > 0) {
    const promedioDiario = totalActual.value / fechasUnicas.size
    lista.push({
      tono: 'neutro', icono: '📊',
      texto: `Promedio diario: ${currencySymbol.value} ${formatMonto(promedioDiario)} en ${fechasUnicas.size} ${fechasUnicas.size === 1 ? 'día' : 'días'} con registros.`,
    })
  }

  return lista.slice(0, 3)
})

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
