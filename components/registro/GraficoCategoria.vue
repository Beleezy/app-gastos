<template>
  <div class="px-4">
    <!-- Filtro de mes -->
    <div class="mb-4">
      <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-2">Mes:</p>
      <div class="flex items-center gap-1.5">
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
          :class="mesSeleccionado === 'actual' ? 'bg-theme-accent-bg text-theme-accent border-theme-accent' : 'bg-theme-card text-theme-text-sec border-theme-border hover:text-theme-text-sec'"
          @click="seleccionarMesGrafico('actual')"
        >
          Actual
        </button>
        <button
          v-for="m in mesesRecientesGrafico"
          :key="m.key"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
          :class="m.key === mesSeleccionado ? 'bg-theme-accent-bg text-theme-accent border-theme-accent' : 'bg-theme-card text-theme-text-sec border-theme-border hover:text-theme-text-sec'"
          @click="seleccionarMesGrafico(m.key)"
        >
          {{ m.label }}
        </button>
        <select
          class="px-2 py-1.5 rounded-lg text-xs font-medium border bg-theme-card text-theme-text-muted border-theme-border outline-none cursor-pointer appearance-none"
          :class="mesGraficoEsAntiguo ? 'bg-theme-accent-bg text-theme-accent border-theme-accent' : ''"
          :value="mesGraficoEsAntiguo ? mesSeleccionado : ''"
          @change="onSelectMesGraficoAntiguo($event)"
        >
          <option value="" disabled>Mes</option>
          <option v-for="m in mesesAntiguosGrafico" :key="m.key" :value="m.key">{{ m.label }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoadingMes" class="flex flex-col items-center py-8">
      <div class="w-44 h-44 rounded-full bg-theme-border-md animate-pulse mx-auto mb-5"></div>
      <div v-for="i in 3" :key="i" class="w-full h-12 bg-theme-border-md rounded-xl animate-pulse mb-2"></div>
    </div>

    <div v-else-if="datosEfectivos.length === 0" class="flex flex-col items-center py-8">
      <div class="w-14 h-14 rounded-full bg-theme-card flex items-center justify-center mb-3">
        <span class="text-xl opacity-50">📊</span>
      </div>
      <p class="text-sm text-theme-text-sec">No hay datos para graficar</p>
    </div>

    <div v-else>
      <!-- Donut chart -->
      <div class="flex justify-center mb-5">
        <div class="relative w-44 h-44">
          <svg
            v-if="datosEfectivos.length > 0"
            viewBox="0 0 100 100"
            class="w-full h-full -rotate-90"
            role="img"
            :aria-label="`Gráfico de gastos por categoría. ${datosEfectivos.length} ${datosEfectivos.length === 1 ? 'categoría' : 'categorías'}. Total ${currencySymbol} ${formatMonto(totalGeneral)}`"
          >
            <circle
              v-for="(seg, i) in segmentos"
              :key="i"
              cx="50" cy="50" r="38"
              fill="none"
              :stroke="seg.color"
              :stroke-width="seleccionada && seleccionada === seg.nombre ? 14 : 12"
              :stroke-dasharray="seg.dash"
              :stroke-dashoffset="seg.offset"
              stroke-linecap="round"
              :opacity="seleccionada && seleccionada !== seg.nombre ? 0.2 : 1"
              class="transition-all duration-400 cursor-pointer"
              :aria-label="`${seg.nombre}: ${currencySymbol} ${formatMonto(seg.total || 0)}`"
              tabindex="0"
              @click="toggleSeleccion(seg.nombre)"
              @keydown.enter.space.prevent="toggleSeleccion(seg.nombre)"
            />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-5 text-center">
            <template v-if="seleccionada">
              <p class="text-xs text-theme-text-sec truncate max-w-full leading-tight">{{ seleccionada }}</p>
              <p class="text-base font-bold text-theme-text leading-tight tabular-nums">{{ currencySymbol }}&nbsp;{{ formatMonto(totalSeleccionada) }}</p>
              <p class="text-[0.6875rem] text-theme-text-sec">{{ porcentajeSeleccionada.toFixed(1) }}%</p>
            </template>
            <template v-else>
              <p class="text-xs text-theme-text-sec leading-tight">Gastado</p>
              <p class="text-base font-bold text-theme-text leading-tight tabular-nums">{{ currencySymbol }}&nbsp;{{ formatMonto(totalGeneral) }}</p>
              <p v-if="presupuesto > 0" class="text-[0.6875rem] leading-tight" :class="totalGeneral <= presupuesto ? 'text-emerald-400' : 'text-red-400'">
                de {{ currencySymbol }}&nbsp;{{ formatMonto(presupuesto) }}
              </p>
            </template>
          </div>
        </div>
      </div>

      <!-- Hint -->
      <p v-if="seleccionada" class="text-center text-[0.6875rem] text-theme-text-muted -mt-3 mb-4">
        Toca de nuevo para quitar el filtro
      </p>

      <!-- Category breakdown -->
      <div class="space-y-2">
        <div
          v-for="cat in datosEfectivos"
          :key="cat.nombre"
          class="rounded-xl border overflow-hidden transition-all duration-300"
          :class="[
            seleccionada && seleccionada !== cat.nombre
              ? 'bg-theme-card border-theme-border opacity-40'
              : 'bg-theme-card border-theme-border opacity-100',
          ]"
        >
          <!-- Category header (clickable) -->
          <button
            class="w-full px-3 py-2.5 text-left transition-colors"
            :class="expandida === cat.nombre ? 'bg-theme-border-md' : 'hover:bg-theme-border-md'"
            @click="toggleExpansion(cat.nombre)"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full shrink-0"
                  :style="{ backgroundColor: cat.color }"
                ></div>
                <span class="text-sm text-theme-text font-medium">{{ cat.nombre }}</span>
                <span class="text-xs text-theme-text-muted">{{ cat.cantidad }} {{ cat.cantidad === 1 ? 'gasto' : 'gastos' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(cat.total) }}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-theme-text-muted transition-transform duration-200"
                  :class="{ 'rotate-180': expandida === cat.nombre }"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <!-- Progress bar -->
            <div class="w-full h-1.5 bg-theme-border-md rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: cat.porcentaje + '%', backgroundColor: cat.color }"
              ></div>
            </div>
            <p class="text-[0.6875rem] text-theme-text-muted mt-1 text-right">{{ cat.porcentaje.toFixed(1) }}%</p>
          </button>

          <!-- Expanded: expense detail list -->
          <Transition name="expand">
            <div v-if="expandida === cat.nombre" class="border-t border-theme-border">
              <div
                v-for="gasto in gastosDeCategoria(cat.nombre)"
                :key="gasto.id"
                class="flex items-center justify-between px-3 py-2 border-b border-theme-border last:border-b-0"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-theme-text-sec truncate">{{ gasto.concepto }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[0.6875rem] text-theme-text-muted">{{ formatFechaCorta(gasto.fecha) }}</span>
                    <span v-if="gasto.hora" class="text-[0.6875rem] text-theme-text-muted">{{ formatHora(gasto.hora) }}</span>
                    <span
v-if="getMetodoRegistroBadgeLabel(gasto)"
                      class="text-[0.625rem] bg-theme-accent-bg text-theme-accent px-1 py-0.5 rounded-full"
                    >{{ getMetodoRegistroBadgeLabel(gasto) }}</span>
                  </div>
                </div>
                <span class="text-sm font-medium text-theme-text shrink-0 ml-3">{{ currencySymbol }}&nbsp;{{ formatMonto(gasto.monto) }}</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getMetodoRegistroBadgeLabel } from '~/utils/metodoRegistro'

// ─── Filtro de mes ──────────────────────────────────────────
import { MESES } from '~/utils/constants'

const props = defineProps({
  datos: { type: Array, default: () => [] },
  gastos: { type: Array, default: () => [] },
  presupuesto: { type: Number, default: 0 },
  categoriaSeleccionadaId: { type: [String, Number, null], default: null },
  categorias: { type: Array, default: () => [] },
  mesActual: { type: Number, default: () => new Date().getMonth() + 1 },
  anioActual: { type: Number, default: () => new Date().getFullYear() },
})

const emit = defineEmits(['update:categoriaSeleccionada'])

const { currencySymbol, formatMonto } = useCurrency()

const mesSeleccionado = ref('actual') // 'actual' o 'YYYY-M'
const isLoadingMes = ref(false)
const gastosOtroMes = ref([])

const mesesDisponiblesGrafico = computed(() => {
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

const mesesRecientesGrafico = computed(() => mesesDisponiblesGrafico.value.slice(0, 3))
const mesesAntiguosGrafico = computed(() => mesesDisponiblesGrafico.value.slice(3))

const mesGraficoEsAntiguo = computed(() =>
  mesesAntiguosGrafico.value.some(m => m.key === mesSeleccionado.value)
)

async function seleccionarMesGrafico(key) {
  mesSeleccionado.value = key
  if (key === 'actual') {
    gastosOtroMes.value = []
    return
  }
  const obj = mesesDisponiblesGrafico.value.find(m => m.key === key)
  if (!obj) return
  isLoadingMes.value = true
  try {
    gastosOtroMes.value = await $fetch('/api/gastos', { query: { mes: obj.mes, anio: obj.anio }, timeout: 15000 })
  } catch { gastosOtroMes.value = [] }
  finally { isLoadingMes.value = false }
}

function onSelectMesGraficoAntiguo(event) {
  const key = event.target.value
  if (key) seleccionarMesGrafico(key)
}

// Gastos efectivos según mes seleccionado
const gastosEfectivos = computed(() =>
  mesSeleccionado.value === 'actual' ? props.gastos : gastosOtroMes.value
)

// Datos de categoría recalculados
const { calcularGastosPorCategoria } = useGraficoCategoriaData()
const datosEfectivos = computed(() => {
  if (mesSeleccionado.value === 'actual') return props.datos
  // Reusa el helper compartido (ver §4.6 planifica.md): devuelve
  // items con shape unificado y porcentajes ya calculados.
  const { items } = calcularGastosPorCategoria(gastosOtroMes.value)
  return items.map((it) => ({
    nombre: it.categoria,
    color: it.color,
    total: it.total,
    cantidad: it.count,
    porcentaje: it.porcentaje,
  }))
})

const mesSeleccionadoLabel = computed(() => {
  if (mesSeleccionado.value === 'actual') return `${MESES[props.mesActual - 1]} ${props.anioActual}`
  const obj = mesesDisponiblesGrafico.value.find(m => m.key === mesSeleccionado.value)
  return obj ? `${MESES[obj.mes - 1]} ${obj.anio}` : ''
})

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const seleccionada = ref(null)
const expandida = ref(null)

const totalGeneral = computed(() => datosEfectivos.value.reduce((sum, c) => sum + c.total, 0))

const totalSeleccionada = computed(() => {
  if (!seleccionada.value) return totalGeneral.value
  const cat = datosEfectivos.value.find(c => c.nombre === seleccionada.value)
  return cat ? cat.total : 0
})

const porcentajeSeleccionada = computed(() => {
  if (!seleccionada.value) return 100
  const cat = datosEfectivos.value.find(c => c.nombre === seleccionada.value)
  return cat ? cat.porcentaje : 0
})

// Sync from parent: when categoriaSeleccionadaId changes, update local seleccionada
watch(() => props.categoriaSeleccionadaId, (newId) => {
  if (newId === null) {
    seleccionada.value = null
  } else {
    const cat = props.categorias.find(c => c.id === newId)
    if (cat) {
      seleccionada.value = cat.nombre
    }
  }
}, { immediate: true })

function emitCategoriaChange(nombre) {
  if (!nombre) {
    emit('update:categoriaSeleccionada', null)
  } else {
    const cat = props.categorias.find(c => c.nombre === nombre)
    emit('update:categoriaSeleccionada', cat?.id || null)
  }
}

function toggleSeleccion(nombre) {
  seleccionada.value = seleccionada.value === nombre ? null : nombre
  emitCategoriaChange(seleccionada.value)
}

function toggleExpansion(nombre) {
  expandida.value = expandida.value === nombre ? null : nombre
  if (expandida.value) {
    seleccionada.value = nombre
  } else {
    seleccionada.value = null
  }
  emitCategoriaChange(seleccionada.value)
}

function gastosDeCategoria(categoriaNombre) {
  return gastosEfectivos.value
    .filter(g => (g.categoriaNombre || 'Otros') === categoriaNombre)
    .sort((a, b) => {
      const cmpFecha = b.fecha.localeCompare(a.fecha)
      if (cmpFecha !== 0) return cmpFecha
      return (b.hora || '').localeCompare(a.hora || '')
    })
}

const CIRCUNFERENCIA = 2 * Math.PI * 38

const segmentos = computed(() => {
  const segs = []
  let acumulado = 0
  const gap = datosEfectivos.value.length > 1 ? 1.5 : 0

  for (const cat of datosEfectivos.value) {
    const porcion = (cat.porcentaje / 100) * CIRCUNFERENCIA
    const porcionConGap = Math.max(porcion - gap, 0.5)
    segs.push({
      nombre: cat.nombre,
      color: cat.color,
      total: cat.total,
      dash: `${porcionConGap} ${CIRCUNFERENCIA - porcionConGap}`,
      offset: -acumulado,
    })
    acumulado += porcion
  }
  return segs
})

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return ''
  const [anio, mes, dia] = fechaStr.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return `${DIAS_SEMANA_CORTO[fecha.getDay()]} ${dia}/${String(mes).padStart(2, '0')}`
}

function formatHora(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}
</script>

<style scoped>
.expand-enter-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}
.expand-leave-active {
  transition: all 0.2s ease-in;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
