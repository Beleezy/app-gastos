<template>
  <div class="px-4 pt-3 pb-28">
    <h1 class="text-2xl font-extrabold text-gradient-blue leading-tight mb-0.5">Métricas</h1>
    <p class="text-[0.78rem] text-theme-text-sec mb-4">Tu historia financiera, mes a mes</p>

    <div v-if="loading" class="space-y-3">
      <div class="grid grid-cols-2 gap-2.5">
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
      </div>
      <div class="h-52 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Promedios -->
      <div class="grid grid-cols-2 gap-2.5 mb-3">
        <div class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Promedio gastos</p>
          <SharedMoney :value="promedios.gastosMensual" tone="red" class="text-xl font-extrabold block mt-1.5" />
          <p class="text-[0.6rem] text-theme-text-muted mt-1">por mes</p>
        </div>
        <div class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Promedio ingresos</p>
          <SharedMoney :value="promedios.ingresosMensual" tone="green" class="text-xl font-extrabold block mt-1.5" />
          <p class="text-[0.6rem] text-theme-text-muted mt-1">por mes</p>
        </div>
      </div>

      <!-- Gráfico con eje Y + gridlines (R2) -->
      <div class="rounded-2xl border border-theme-border bg-theme-card p-4 mb-3">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-bold text-theme-text">Flujo · últimos {{ serie.length }} meses</p>
          <p class="text-[0.66rem]">
            <span class="text-emerald-400">●</span> Ingresos
            <span class="text-red-400 ml-1.5">●</span> Gastos
          </p>
        </div>

        <div class="flex gap-2" style="height: 158px">
          <!-- eje Y -->
          <div class="flex flex-col justify-between text-right pb-5 shrink-0" style="width: 38px">
            <span class="text-[0.55rem] text-theme-text-muted tabular-nums">{{ yLabel(niceMax) }}</span>
            <span class="text-[0.55rem] text-theme-text-muted tabular-nums">{{ yLabel(niceMax / 2) }}</span>
            <span class="text-[0.55rem] text-theme-text-muted tabular-nums">0</span>
          </div>
          <!-- plot -->
          <div class="relative flex-1">
            <div class="absolute inset-x-0 top-0 border-t border-theme-border/60"></div>
            <div class="absolute inset-x-0 top-1/2 border-t border-theme-border/40"></div>
            <div class="absolute inset-x-0 border-t border-theme-border/60" style="bottom: 20px"></div>
            <div class="absolute inset-x-0 top-0 flex items-end justify-around" style="bottom: 20px">
              <div v-for="(m, i) in serie" :key="i" class="flex flex-col items-center justify-end h-full gap-1">
                <div class="flex items-end gap-[3px] h-full">
                  <div
                    class="w-2.5 rounded-t bg-gradient-to-b from-emerald-400 to-emerald-500"
                    :style="{ height: barH(m.ingresos) }"
                    :title="`Ingresos: ${m.ingresos}`"
                  ></div>
                  <div
                    class="w-2.5 rounded-t bg-gradient-to-b from-red-400 to-rose-500"
                    :style="{ height: barH(m.gastos) }"
                    :title="`Gastos: ${m.gastos}`"
                  ></div>
                </div>
              </div>
            </div>
            <div class="absolute inset-x-0 bottom-0 flex justify-around">
              <span v-for="(m, i) in serie" :key="i" class="text-[0.58rem] text-theme-text-muted">{{ mesCorto(m.mes) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalle mensual: tarjetas apiladas (no tabla cortada) -->
      <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Detalle mensual</p>
      <div class="space-y-2">
        <div v-for="(m, i) in serieReciente" :key="i" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-center justify-between mb-2.5">
            <span class="text-sm font-bold text-theme-text capitalize">{{ mesLargo(m.mes) }} {{ m.anio }}</span>
            <SharedMoney :value="m.saldoNeto" signo tone="auto" class="text-sm font-bold" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Ingresos</p>
              <SharedMoney :value="m.ingresos" compact tone="green" class="text-[0.82rem] font-semibold block mt-0.5" />
            </div>
            <div>
              <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Gastos</p>
              <SharedMoney :value="m.gastos" compact tone="red" class="text-[0.82rem] font-semibold block mt-0.5" />
            </div>
            <div>
              <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Ahorro</p>
              <SharedMoney :value="m.ahorros" compact tone="sky" class="text-[0.82rem] font-semibold block mt-0.5" />
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

const { currencySymbol } = useCurrency()
function yLabel(v) {
  if (v >= 1000) return `${currencySymbol.value} ${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `${currencySymbol.value} ${Math.round(v)}`
}
function barH(v) {
  if (niceMax.value <= 0) return '0%'
  return `${Math.max(v > 0 ? 3 : 0, (v / niceMax.value) * 100)}%`
}

// Detalle: del más reciente al más antiguo.
const serieReciente = computed(() => [...serie.value].reverse())

onMounted(async () => {
  try {
    const r = await apiFetch('/api/metricas/historico', { query: { meses: 6 } })
    serie.value = r.serie || []
    promedios.value = r.promedios || promedios.value
  } catch {
    // preview: silencioso
  } finally {
    loading.value = false
  }
})
</script>
