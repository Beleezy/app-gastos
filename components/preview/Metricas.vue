<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="📊" title="Métricas" subtitle="Tu historia financiera, mes a mes" />

    <!-- Selector de período -->
    <div class="flex gap-2 mb-4 p-1 rounded-2xl bg-theme-input">
      <button
        v-for="opt in periodos"
        :key="opt"
        class="flex-1 min-h-[44px] rounded-xl text-[0.8rem] font-semibold transition-colors"
        :class="meses === opt ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-text-muted'"
        @click="cambiarPeriodo(opt)"
      >
        {{ opt }} meses
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div class="grid grid-cols-2 gap-2.5">
        <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
        <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
      </div>
      <div class="h-52 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Promedios -->
      <div class="grid grid-cols-2 gap-2.5 mb-3">
        <div class="rounded-2xl border border-theme-border bg-theme-card p-4 min-w-0">
          <p class="text-[0.62rem] uppercase tracking-wider font-bold text-theme-text-muted">Prom. gastos</p>
          <PreviewMoney :value="promedios.gastosMensual" compact entero tone="red" class="text-lg font-extrabold block mt-1.5" />
          <p class="text-[0.64rem] text-theme-text-muted mt-1">por mes</p>
        </div>
        <div class="rounded-2xl border border-theme-border bg-theme-card p-4 min-w-0">
          <p class="text-[0.62rem] uppercase tracking-wider font-bold text-theme-text-muted">Prom. ingresos</p>
          <PreviewMoney :value="promedios.ingresosMensual" compact entero tone="green" class="text-lg font-extrabold block mt-1.5" />
          <p class="text-[0.64rem] text-theme-text-muted mt-1">por mes</p>
        </div>
      </div>

      <!-- Gráfico con eje Y + gridlines -->
      <div class="rounded-2xl border border-theme-border bg-theme-card p-4 mb-3">
        <div class="flex items-center justify-between gap-2 mb-3">
          <p class="text-sm font-bold text-theme-text min-w-0 truncate">Flujo · {{ serie.length }} meses</p>
          <p class="text-[0.66rem] shrink-0">
            <span class="text-emerald-400">●</span> Ingresos
            <span class="text-red-400 ml-1.5">●</span> Gastos
          </p>
        </div>

        <div class="flex gap-2" style="height: 158px">
          <!-- eje Y: ancho suficiente para "S/ 5,000" completo con texto grande -->
          <div class="flex flex-col justify-between text-right pb-5 shrink-0" style="width: 56px">
            <span class="text-[0.6rem] text-theme-text-muted tabular-nums whitespace-nowrap">{{ yLabel(niceMax) }}</span>
            <span class="text-[0.6rem] text-theme-text-muted tabular-nums whitespace-nowrap">{{ yLabel(niceMax / 2) }}</span>
            <span class="text-[0.6rem] text-theme-text-muted tabular-nums">0</span>
          </div>
          <!-- plot -->
          <div class="relative flex-1">
            <div class="absolute inset-x-0 top-0 border-t border-theme-border/60"></div>
            <div class="absolute inset-x-0 top-1/2 border-t border-theme-border/40"></div>
            <div class="absolute inset-x-0 border-t border-theme-border/60" style="bottom: 20px"></div>
            <div class="absolute inset-x-0 top-0 flex items-end justify-around" style="bottom: 20px">
              <div v-for="(m, i) in serie" :key="i" class="flex flex-col items-center justify-end h-full">
                <div class="flex items-end h-full" :style="{ gap: barGap }">
                  <div
                    class="rounded-t bg-gradient-to-b from-emerald-400 to-emerald-500"
                    :style="{ height: barH(m.ingresos), width: barWidth }"
                  ></div>
                  <div
                    class="rounded-t bg-gradient-to-b from-red-400 to-rose-500"
                    :style="{ height: barH(m.gastos), width: barWidth }"
                  ></div>
                </div>
              </div>
            </div>
            <div class="absolute inset-x-0 bottom-0 flex justify-around">
              <span v-for="(m, i) in serie" :key="i" class="text-[0.6rem] text-theme-text-muted">{{ mostrarLabel(i) ? mesCorto(m.mes) : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalle mensual: tarjetas apiladas (jamás una tabla cortada) -->
      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Detalle mensual</p>
      <div class="space-y-2">
        <div v-for="(m, i) in serieReciente" :key="i" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-center justify-between gap-2 mb-2.5">
            <span class="text-sm font-bold text-theme-text capitalize min-w-0 truncate">{{ mesLargo(m.mes) }} {{ m.anio }}</span>
            <PreviewMoney :value="m.saldoNeto" signo tone="auto" class="text-sm font-bold shrink-0" />
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <div class="min-w-0">
              <p class="text-[0.6rem] uppercase tracking-wide text-theme-text-muted">Ingresos</p>
              <PreviewMoney :value="m.ingresos" compact entero tone="green" class="text-[0.82rem] font-semibold block mt-0.5" />
            </div>
            <div class="min-w-0">
              <p class="text-[0.6rem] uppercase tracking-wide text-theme-text-muted">Gastos</p>
              <PreviewMoney :value="m.gastos" compact entero tone="red" class="text-[0.82rem] font-semibold block mt-0.5" />
            </div>
            <div class="min-w-0">
              <p class="text-[0.6rem] uppercase tracking-wide text-theme-text-muted">Ahorro</p>
              <PreviewMoney :value="m.ahorros" compact entero tone="sky" class="text-[0.82rem] font-semibold block mt-0.5" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()

const loading = ref(true)
const serie = ref([])
const promedios = ref({ gastosMensual: 0, ingresosMensual: 0, ahorrosMensual: 0 })
const periodos = [6, 12, 24]
const meses = ref(6)

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesCorto = (m) => MESES_CORTOS[(m - 1 + 12) % 12]
const mesLargo = (m) => MESES_LARGOS[(m - 1 + 12) % 12]

// Máximo "bonito" para el eje Y.
function niceCeil(v) {
  if (!v || v <= 0) return 1000
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return m * pow
}

const maxVal = computed(() => serie.value.reduce((mx, m) => Math.max(mx, m.gastos, m.ingresos), 0))
const niceMax = computed(() => niceCeil(maxVal.value))

const { currencySymbol, currencyLocale } = useCurrency()
// Eje Y: misma regla de moneda — hasta 4 cifras completas; "k" desde 10,000.
// Espacio duro: el símbolo y el número no se separan en dos líneas.
const NBSP = ' '
function yLabel(v) {
  if (v >= 10_000) return `${currencySymbol.value}${NBSP}${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `${currencySymbol.value}${NBSP}${Math.round(v).toLocaleString(currencyLocale.value)}`
}
function barH(v) {
  if (niceMax.value <= 0) return '0%'
  return `${Math.max(v > 0 ? 3 : 0, (v / niceMax.value) * 100)}%`
}

// Ancho de barra adaptativo según cuántos meses se muestran.
const barWidth = computed(() => (serie.value.length <= 6 ? '10px' : serie.value.length <= 12 ? '6px' : '3px'))
const barGap = computed(() => (serie.value.length <= 12 ? '3px' : '1px'))
// Con muchos meses, mostrar 1 de cada N etiquetas para que no se encimen.
function mostrarLabel(i) {
  const n = serie.value.length
  if (n <= 12) return true
  const paso = Math.ceil(n / 8)
  return i % paso === 0 || i === n - 1
}

// Detalle: del más reciente al más antiguo.
const serieReciente = computed(() => [...serie.value].reverse())

async function cargar() {
  loading.value = true
  try {
    const r = await apiFetch('/api/metricas/historico', { query: { meses: meses.value } })
    serie.value = r.serie || []
    promedios.value = r.promedios || promedios.value
  } catch {
    // preview: silencioso
  } finally {
    loading.value = false
  }
}

function cambiarPeriodo(m) {
  if (meses.value === m) return
  meses.value = m
  cargar()
}

onMounted(cargar)
</script>
