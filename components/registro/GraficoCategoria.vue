<template>
  <div class="px-4">
    <!-- Filtro de mes -->
    <div class="mb-4">
      <p class="text-[0.6875rem] text-theme-text-sec uppercase tracking-wider mb-2">Mes:</p>
      <div class="flex items-center gap-1.5">
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
          :class="
            mesSeleccionado === 'actual'
              ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
              : 'bg-theme-card text-theme-text-sec border-theme-border hover:text-theme-text-sec'
          "
          @click="seleccionarMesGrafico('actual')"
        >
          Actual
        </button>
        <button
          v-for="m in mesesRecientesGrafico"
          :key="m.key"
          class="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
          :class="
            m.key === mesSeleccionado
              ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
              : 'bg-theme-card text-theme-text-sec border-theme-border hover:text-theme-text-sec'
          "
          @click="seleccionarMesGrafico(m.key)"
        >
          {{ m.labelCorto }}
        </button>
        <select
          class="px-2 py-1.5 rounded-lg text-xs font-medium border bg-theme-card text-theme-text-muted border-theme-border outline-none cursor-pointer appearance-none"
          :class="
            mesGraficoEsAntiguo ? 'bg-theme-accent-bg text-theme-accent border-theme-accent' : ''
          "
          :value="mesGraficoEsAntiguo ? mesSeleccionado : ''"
          @change="onSelectMesGraficoAntiguo($event)"
        >
          <option value="" disabled>Mes</option>
          <option v-for="m in mesesAntiguosGrafico" :key="m.key" :value="m.key">
            {{ m.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoadingMes" class="flex flex-col items-center py-8">
      <div class="w-44 h-44 rounded-full bg-theme-border-md animate-pulse mx-auto mb-5"></div>
      <div
        v-for="i in 3"
        :key="i"
        class="w-full h-12 bg-theme-border-md rounded-xl animate-pulse mb-2"
      ></div>
    </div>

    <!-- Mismo formato que el gráfico del planificador: una tarjeta con el
         donut compacto, la leyenda en filas y el detalle debajo. Antes cada
         categoría era una tarjeta con borde propio y un desplegable dentro,
         que pesaba mucho más de lo que aporta. -->
    <div v-else class="bg-theme-card rounded-2xl p-4">
      <h3 class="text-sm font-semibold text-theme-text mb-4">Distribución por categoría</h3>

      <div v-if="datosEfectivos.length === 0" role="status" class="text-center py-6">
        <p class="text-theme-text-sec text-sm">Sin datos para mostrar</p>
      </div>

      <div v-else class="flex flex-col items-center gap-4">
        <!-- Donut. Los segmentos NO son focusables: el anillo de foco del
             navegador se dibuja sobre la caja del <circle>, o sea un
             rectángulo alrededor de todo el donut — el «cuadro blanco» que
             aparecía al seleccionar. Quien navegue con teclado usa los
             botones de la leyenda, que hacen exactamente lo mismo. -->
        <div class="relative w-32 h-32 shrink-0">
          <svg
            viewBox="0 0 36 36"
            class="w-full h-full -rotate-90"
            role="img"
            :aria-label="`Gráfico de gastos por categoría. ${datosEfectivos.length} ${datosEfectivos.length === 1 ? 'categoría' : 'categorías'}. Total ${currencySymbol} ${formatMonto(totalGeneral)}`"
          >
            <circle
              v-for="seg in segmentos"
              :key="seg.nombre"
              cx="18"
              cy="18"
              r="14"
              fill="none"
              :stroke="seg.color"
              :stroke-width="seleccionada === seg.nombre ? 5 : 4"
              pathLength="100"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              stroke-linecap="butt"
              class="cursor-pointer transition-all duration-400"
              :opacity="seleccionada && seleccionada !== seg.nombre ? 0.2 : 1"
              @click="toggleSeleccion(seg.nombre)"
            />
          </svg>
          <!-- Texto del centro -->
          <div
            class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3"
          >
            <template v-if="seleccionada">
              <span class="text-[0.6875rem] text-theme-text-sec leading-tight truncate max-w-full">
                {{ seleccionada }}
              </span>
              <span class="text-xs font-bold text-theme-text leading-tight">
                {{ porcentajeSeleccionada.toFixed(1) }}%
              </span>
              <span
                class="text-theme-text-muted leading-tight tabular-nums"
                :class="tamanoCentro(montoSeleccionadaTexto)"
              >
                {{ montoSeleccionadaTexto }}
              </span>
            </template>
            <template v-else>
              <span class="text-xs text-theme-text-sec leading-tight">Gastado</span>
              <span
                class="font-bold text-theme-text leading-tight tabular-nums"
                :class="tamanoCentro(totalGeneralTexto)"
              >
                {{ totalGeneralTexto }}
              </span>
              <span
                v-if="presupuesto > 0"
                class="text-[0.625rem] leading-tight tabular-nums"
                :class="totalGeneral <= presupuesto ? 'text-emerald-400' : 'text-red-400'"
              >
                de {{ currencySymbol }}&nbsp;{{ formatMonto(presupuesto) }}
              </span>
            </template>
          </div>
        </div>

        <p v-if="seleccionada" class="text-center text-[0.6875rem] text-theme-text-muted -mt-2">
          Toca de nuevo para quitar el filtro
        </p>

        <!-- Leyenda -->
        <div class="space-y-2 w-full">
          <button
            v-for="cat in datosEfectivos"
            :key="cat.nombre"
            class="w-full flex flex-col gap-1 px-2 py-1.5 rounded-lg transition-all duration-200 text-left"
            :class="[
              seleccionada === cat.nombre ? 'bg-theme-border-md' : 'hover:bg-theme-border-md',
              seleccionada && seleccionada !== cat.nombre ? 'opacity-40' : 'opacity-100',
            ]"
            @click="toggleSeleccion(cat.nombre)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-2.5 h-2.5 rounded-sm shrink-0"
                  :style="{ backgroundColor: cat.color }"
                ></span>
                <span class="text-xs text-theme-text-muted truncate">{{ cat.nombre }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[0.6875rem] text-theme-text-sec tabular-nums">
                  {{ currencySymbol }}&nbsp;{{ formatMonto(cat.total) }}
                </span>
                <span
                  class="text-xs font-semibold w-11 text-right tabular-nums"
                  :style="{ color: cat.color }"
                >
                  {{ cat.porcentaje.toFixed(1) }}%
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 w-full">
              <div class="flex-1 h-1 bg-theme-input rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{ width: cat.porcentaje + '%', backgroundColor: cat.color }"
                ></div>
              </div>
              <span class="text-[0.6875rem] text-theme-text-muted shrink-0">
                {{ cat.cantidad }} {{ cat.cantidad === 1 ? 'gasto' : 'gastos' }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Resumen de la categoría activa -->
      <Transition name="tooltip-slide">
        <div
          v-if="categoriaActiva"
          class="mt-3 px-3 py-2 rounded-xl border"
          :style="{
            backgroundColor: categoriaActiva.color + '18',
            borderColor: categoriaActiva.color + '40',
          }"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-theme-text truncate">
              {{ categoriaActiva.nombre }}
            </span>
            <button
              class="tap-target text-theme-text-sec hover:text-theme-text text-xs shrink-0"
              aria-label="Quitar el filtro de categoría"
              @click="toggleSeleccion(categoriaActiva.nombre)"
            >
              ✕
            </button>
          </div>
          <div class="flex items-center gap-4 mt-1">
            <div>
              <p class="text-[0.6875rem] text-theme-text-sec">Gastado</p>
              <p class="text-sm font-bold text-theme-text tabular-nums">
                {{ currencySymbol }}&nbsp;{{ formatMonto(categoriaActiva.total) }}
              </p>
            </div>
            <div>
              <p class="text-[0.6875rem] text-theme-text-sec">Gastos</p>
              <p class="text-sm font-bold text-theme-text tabular-nums">
                {{ categoriaActiva.cantidad }}
              </p>
            </div>
            <div>
              <p class="text-[0.6875rem] text-theme-text-sec">Del total</p>
              <p class="text-sm font-bold tabular-nums" :style="{ color: categoriaActiva.color }">
                {{ categoriaActiva.porcentaje.toFixed(1) }}%
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Gastos de la categoría activa, fuera de la tarjeta para ganar ancho -->
    <Transition name="tooltip-slide">
      <div v-if="categoriaActiva && gastosDeCategoriaActiva.length > 0" class="mt-3">
        <div class="px-1 mb-2 flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :style="{ backgroundColor: categoriaActiva.color }"
          ></span>
          <p class="text-[0.6875rem] font-semibold text-theme-text-sec uppercase tracking-wider">
            Gastos de {{ categoriaActiva.nombre }} ({{ gastosDeCategoriaActiva.length }})
          </p>
        </div>
        <div class="space-y-2">
          <div
            v-for="gasto in gastosDeCategoriaActiva"
            :key="gasto.id"
            class="bg-theme-card rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm text-theme-text truncate">{{ gasto.concepto }}</p>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="text-[0.6875rem] text-theme-text-muted">
                  {{ formatFechaCorta(gasto.fecha) }}
                </span>
                <span v-if="gasto.hora" class="text-[0.6875rem] text-theme-text-muted">
                  {{ formatHora(gasto.hora) }}
                </span>
                <span
                  v-if="getMetodoRegistroBadgeLabel(gasto)"
                  class="text-[0.625rem] bg-theme-accent-bg text-theme-accent px-1 py-0.5 rounded-full"
                >
                  {{ getMetodoRegistroBadgeLabel(gasto) }}
                </span>
              </div>
            </div>
            <span class="text-sm font-semibold text-theme-text shrink-0 tabular-nums">
              {{ currencySymbol }}&nbsp;{{ formatMonto(gasto.monto) }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { getMetodoRegistroBadgeLabel } from '~/utils/metodoRegistro'

// ─── Filtro de mes ──────────────────────────────────────────
import { mesesAnteriores } from '~/utils/constants'

// Botones de acceso rápido a meses anteriores. Dos es lo que cabe a 370 px
// junto al botón del mes en curso y el desplegable del resto.
const MESES_RAPIDOS = 2

// `apiFetch` y no `$fetch`: el plugin plugins/fetch.js es el que inyecta
// el token de Supabase, añade el cache-buster del perfil activo y traduce
// 401/429 a un toast. CLAUDE.md lo marca como obligatorio para todo
// fetch autenticado.
const { apiFetch } = useApiFetch()

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

const { currencySymbol, formatMonto, formatMontoConSimbolo } = useCurrency()

const mesSeleccionado = ref('actual') // 'actual' o 'YYYY-M'
const isLoadingMes = ref(false)
const gastosOtroMes = ref([])

const mesesDisponiblesGrafico = computed(() => mesesAnteriores(props.mesActual, props.anioActual))

// Dos botones, no tres: a 370 px «Actual + 3 meses + desplegable» son cinco
// controles en una fila y el texto de los meses se partía en dos líneas.
const mesesRecientesGrafico = computed(() => mesesDisponiblesGrafico.value.slice(0, MESES_RAPIDOS))
const mesesAntiguosGrafico = computed(() => mesesDisponiblesGrafico.value.slice(MESES_RAPIDOS))

const mesGraficoEsAntiguo = computed(() =>
  mesesAntiguosGrafico.value.some((m) => m.key === mesSeleccionado.value),
)

async function seleccionarMesGrafico(key) {
  mesSeleccionado.value = key
  if (key === 'actual') {
    gastosOtroMes.value = []
    return
  }
  const obj = mesesDisponiblesGrafico.value.find((m) => m.key === key)
  if (!obj) return
  isLoadingMes.value = true
  try {
    gastosOtroMes.value = await apiFetch('/api/gastos', {
      query: { mes: obj.mes, anio: obj.anio },
      timeout: 15000,
    })
  } catch {
    gastosOtroMes.value = []
  } finally {
    isLoadingMes.value = false
  }
}

function onSelectMesGraficoAntiguo(event) {
  const key = event.target.value
  if (key) seleccionarMesGrafico(key)
}

// Gastos efectivos según mes seleccionado
const gastosEfectivos = computed(() =>
  mesSeleccionado.value === 'actual' ? props.gastos : gastosOtroMes.value,
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

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const seleccionada = ref(null)

const totalGeneral = computed(() => datosEfectivos.value.reduce((sum, c) => sum + c.total, 0))

// El hueco del donut son ~76 px útiles. Un total de siete cifras no cabe y,
// como no tiene por dónde partirse, se sale del anillo (el mismo problema que
// el resumen del mes, documentado en CLAUDE.md). Encoger conserva los
// dígitos; recortar perdería la cifra que se viene a mirar.
function tamanoCentro(texto) {
  const n = texto.length
  if (n >= 16) return 'text-[0.5625rem]'
  if (n >= 13) return 'text-[0.625rem]'
  if (n >= 11) return 'text-xs'
  return 'text-sm'
}

const totalGeneralTexto = computed(() => formatMontoConSimbolo(totalGeneral.value))
const montoSeleccionadaTexto = computed(() => formatMontoConSimbolo(totalSeleccionada.value))

const categoriaActiva = computed(() =>
  seleccionada.value
    ? datosEfectivos.value.find((c) => c.nombre === seleccionada.value) || null
    : null,
)

const gastosDeCategoriaActiva = computed(() =>
  categoriaActiva.value ? gastosDeCategoria(categoriaActiva.value.nombre) : [],
)

const totalSeleccionada = computed(() => {
  if (!seleccionada.value) return totalGeneral.value
  const cat = datosEfectivos.value.find((c) => c.nombre === seleccionada.value)
  return cat ? cat.total : 0
})

const porcentajeSeleccionada = computed(() => {
  if (!seleccionada.value) return 100
  const cat = datosEfectivos.value.find((c) => c.nombre === seleccionada.value)
  return cat ? cat.porcentaje : 0
})

// Sync from parent: when categoriaSeleccionadaId changes, update local seleccionada
watch(
  () => props.categoriaSeleccionadaId,
  (newId) => {
    if (newId === null) {
      seleccionada.value = null
    } else {
      const cat = props.categorias.find((c) => c.id === newId)
      if (cat) {
        seleccionada.value = cat.nombre
      }
    }
  },
  { immediate: true },
)

function emitCategoriaChange(nombre) {
  if (!nombre) {
    emit('update:categoriaSeleccionada', null)
  } else {
    const cat = props.categorias.find((c) => c.nombre === nombre)
    emit('update:categoriaSeleccionada', cat?.id || null)
  }
}

function toggleSeleccion(nombre) {
  seleccionada.value = seleccionada.value === nombre ? null : nombre
  emitCategoriaChange(seleccionada.value)
}

function gastosDeCategoria(categoriaNombre) {
  return gastosEfectivos.value
    .filter((g) => (g.categoriaNombre || 'Otros') === categoriaNombre)
    .sort((a, b) => {
      const cmpFecha = b.fecha.localeCompare(a.fecha)
      if (cmpFecha !== 0) return cmpFecha
      return (b.hora || '').localeCompare(a.hora || '')
    })
}

// `pathLength="100"` deja el dasharray directamente en porcentaje, que es lo
// que ya tenemos calculado — el mismo cálculo que usa el gráfico del
// planificador (`datosGrafico` en usePlanificador.js).
const segmentos = computed(() => {
  let acumulado = 0
  return datosEfectivos.value.map((cat) => {
    const porcentaje = cat.porcentaje
    const dashoffset = -acumulado
    acumulado += porcentaje
    return {
      nombre: cat.nombre,
      color: cat.color,
      total: cat.total,
      dasharray: `${porcentaje} ${100 - porcentaje}`,
      dashoffset,
    }
  })
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
/* Misma transición que el gráfico del planificador. */
.tooltip-slide-enter-active,
.tooltip-slide-leave-active {
  transition: all 0.2s ease;
}
.tooltip-slide-enter-from,
.tooltip-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
