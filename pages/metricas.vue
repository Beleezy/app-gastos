<template>
  <div class="min-h-screen flex flex-col">
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-theme-accent-bg rounded-full blur-3xl"></div>
      <div class="relative flex items-center gap-3">
        <button
          class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          @click="toggleDrawer"
          title="Menú"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-gradient-blue">Métricas</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Tu historia financiera, mes a mes</p>
        </div>
      </div>
    </div>

    <!-- Selector de período -->
    <div class="px-5 lg:px-0 mb-4">
      <div class="flex items-center gap-1 bg-theme-card/60 rounded-2xl p-1 border border-theme-border/50 max-w-md">
        <button
          v-for="opt in opcionesMeses"
          :key="opt.valor"
          @click="cambiarMeses(opt.valor)"
          class="flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
          :class="meses === opt.valor ? 'bg-theme-accent text-theme-on-accent shadow-md' : 'text-theme-text-muted hover:text-theme-text-sec'"
        >
          {{ opt.etiqueta }}
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="px-5 lg:px-0 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Promedio gastos</p>
        <div v-if="cargando" class="h-5 w-20 rounded-md bg-theme-border-md shimmer mt-1.5"></div>
        <p v-else class="text-lg font-bold text-rose-400 mt-1">{{ currencySymbol }}&nbsp;{{ formatMonto(promedios.gastosMensual) }}</p>
        <p class="text-[10px] text-theme-text-muted mt-0.5">por mes</p>
      </div>
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Promedio ingresos</p>
        <div v-if="cargando" class="h-5 w-20 rounded-md bg-theme-border-md shimmer mt-1.5"></div>
        <p v-else class="text-lg font-bold text-emerald-400 mt-1">{{ currencySymbol }}&nbsp;{{ formatMonto(promedios.ingresosMensual) }}</p>
        <p class="text-[10px] text-theme-text-muted mt-0.5">por mes</p>
      </div>
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Promedio ahorros</p>
        <div v-if="cargando" class="h-5 w-20 rounded-md bg-theme-border-md shimmer mt-1.5"></div>
        <p v-else class="text-lg font-bold text-sky-400 mt-1">{{ currencySymbol }}&nbsp;{{ formatMonto(promedios.ahorrosMensual) }}</p>
        <p class="text-[10px] text-theme-text-muted mt-0.5">por mes</p>
      </div>
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Tasa de ahorro</p>
        <div v-if="cargando" class="h-5 w-20 rounded-md bg-theme-border-md shimmer mt-1.5"></div>
        <p v-else class="text-lg font-bold mt-1" :class="tasaAhorro >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ tasaAhorro.toFixed(1) }}%</p>
        <p class="text-[10px] text-theme-text-muted mt-0.5">ingresos guardados</p>
      </div>
    </div>

    <!-- Gráfico de barras: gastos vs ingresos -->
    <div class="px-5 lg:px-0 mb-4">
      <div class="bg-theme-card rounded-2xl p-4 border border-theme-border">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-theme-text">Flujo mensual</p>
          <div class="flex items-center gap-3 text-[10px] text-theme-text-muted">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-emerald-400"></span>Ingresos</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-rose-400"></span>Gastos</span>
          </div>
        </div>
        <div v-if="cargando" class="h-48 w-full rounded-xl bg-theme-border-md shimmer"></div>
        <div v-else-if="!serie.length" class="h-48 flex items-center justify-center text-xs text-theme-text-muted">
          Sin datos en este período.
        </div>
        <div v-else class="relative">
          <svg :viewBox="`0 0 ${anchoSvg} 200`" preserveAspectRatio="none" class="w-full h-48">
            <g v-for="(p, i) in serie" :key="`${p.anio}-${p.mes}`">
              <!-- Barra ingresos -->
              <rect
                :x="i * anchoColumna + 4"
                :y="200 - alturaBarra(p.ingresos)"
                :width="(anchoColumna - 8) / 2"
                :height="alturaBarra(p.ingresos)"
                fill="rgb(52 211 153)"
                opacity="0.85"
                rx="2"
              />
              <!-- Barra gastos -->
              <rect
                :x="i * anchoColumna + 4 + (anchoColumna - 8) / 2"
                :y="200 - alturaBarra(p.gastos)"
                :width="(anchoColumna - 8) / 2"
                :height="alturaBarra(p.gastos)"
                fill="rgb(251 113 133)"
                opacity="0.85"
                rx="2"
              />
            </g>
          </svg>
          <div class="grid grid-flow-col auto-cols-fr mt-1">
            <div
              v-for="p in serie"
              :key="`l-${p.anio}-${p.mes}`"
              class="text-[9px] text-theme-text-muted text-center truncate"
            >
              {{ etiquetaMes(p.mes) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla detallada -->
    <div class="px-5 lg:px-0 mb-8">
      <div class="bg-theme-card rounded-2xl border border-theme-border overflow-hidden">
        <div class="p-3 border-b border-theme-border flex items-center justify-between">
          <p class="text-xs font-semibold text-theme-text">Detalle mensual</p>
          <button
            v-if="!cargando"
            @click="exportarCsv"
            class="text-[10px] text-theme-accent hover:text-theme-accent-light transition-colors"
          >
            Exportar CSV
          </button>
        </div>
        <div v-if="cargando" class="p-4 space-y-2">
          <div class="h-6 w-full rounded bg-theme-border-md shimmer"></div>
          <div class="h-6 w-full rounded bg-theme-border-md shimmer"></div>
          <div class="h-6 w-full rounded bg-theme-border-md shimmer"></div>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="text-[10px] uppercase text-theme-text-muted bg-theme-input/50">
              <tr>
                <th class="text-left px-3 py-2 font-medium">Mes</th>
                <th class="text-right px-3 py-2 font-medium">Ingresos</th>
                <th class="text-right px-3 py-2 font-medium">Gastos</th>
                <th class="text-right px-3 py-2 font-medium">Ahorros</th>
                <th class="text-right px-3 py-2 font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in serieInvertida"
                :key="`r-${p.anio}-${p.mes}`"
                class="border-t border-theme-border/40"
              >
                <td class="px-3 py-2 text-theme-text">{{ etiquetaMes(p.mes) }} {{ p.anio }}</td>
                <td class="px-3 py-2 text-right text-emerald-400">{{ currencySymbol }}&nbsp;{{ formatMonto(p.ingresos) }}</td>
                <td class="px-3 py-2 text-right text-rose-400">{{ currencySymbol }}&nbsp;{{ formatMonto(p.gastos) }}</td>
                <td class="px-3 py-2 text-right text-sky-400">{{ currencySymbol }}&nbsp;{{ formatMonto(p.ahorros) }}</td>
                <td class="px-3 py-2 text-right font-semibold" :class="p.saldoNeto >= 0 ? 'text-emerald-400' : 'text-red-400'">
                  {{ p.saldoNeto >= 0 ? '+' : '' }}{{ currencySymbol }}&nbsp;{{ formatMonto(p.saldoNeto) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Recurrentes detectados -->
    <div class="px-5 lg:px-0 mb-4">
      <div class="bg-theme-card rounded-2xl border border-theme-border overflow-hidden">
        <div class="p-3 border-b border-theme-border flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-theme-text">Gastos recurrentes detectados</p>
            <p class="text-[10px] text-theme-text-muted mt-0.5">Patrones que se repiten en tus últimos 6 meses</p>
          </div>
          <span v-if="!cargandoRecurrentes" class="text-[10px] text-theme-text-muted">{{ recurrentes.length }} encontrados</span>
        </div>
        <div v-if="cargandoRecurrentes" class="p-4 space-y-2">
          <div class="h-10 w-full rounded-xl bg-theme-border-md shimmer"></div>
          <div class="h-10 w-full rounded-xl bg-theme-border-md shimmer"></div>
        </div>
        <div v-else-if="!recurrentes.length" class="p-6 text-center text-xs text-theme-text-muted">
          Sin patrones claros aún. Registra más gastos para ver detecciones.
        </div>
        <ul v-else class="divide-y divide-theme-border/40">
          <li
            v-for="(r, i) in recurrentes.slice(0, 12)"
            :key="`${r.concepto}-${r.categoria.id || i}`"
            class="p-3 flex items-center gap-3"
          >
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
              :style="{ backgroundColor: (r.categoria.color || '#6b7280') + '20' }"
            >
              {{ r.categoria.icono || '📦' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-theme-text truncate">{{ r.concepto }}</p>
              <p class="text-[10px] text-theme-text-muted truncate">
                {{ r.categoria.nombre || 'Sin categoría' }} · {{ r.mesesDistintos }} meses · último {{ r.ultimaFecha }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-semibold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(r.promedio) }}</p>
              <div class="mt-0.5 flex items-center justify-end gap-1">
                <span class="text-[9px] text-theme-text-muted">{{ r.confianza }}%</span>
                <div class="w-10 h-1 bg-theme-input rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :class="r.confianza >= 70 ? 'bg-emerald-400' : r.confianza >= 50 ? 'bg-amber-400' : 'bg-theme-text-muted'"
                    :style="{ width: r.confianza + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Nota de integración futura -->
    <div class="px-5 lg:px-0 mb-8">
      <div class="rounded-2xl border border-dashed border-theme-border bg-theme-card/40 p-3 flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-[11px] text-theme-text-muted leading-relaxed space-y-1">
          <p><strong class="text-theme-text">Módulo independiente.</strong> No modifica /registro, /planificador ni /deudas.</p>
          <p>Próximas integraciones naturales:</p>
          <ul class="list-disc list-inside space-y-0.5">
            <li>Dashboard: card "Gasto del mes" enlazaría aquí.</li>
            <li>Registro: StatsComparativas reutiliza esta serie para extender de 3 a 12 meses sin nueva query.</li>
            <li>Planificador: los recurrentes detectados se promueven a gastos planificados con un click.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MESES } from '~/utils/constants'

definePageMeta({ keepalive: false })

const { currencySymbol, formatMonto } = useCurrency()
const { toggle: toggleDrawer } = useMobileDrawer()
const { apiFetch } = useApiFetch()

const opcionesMeses = [
  { valor: 6, etiqueta: '6 meses' },
  { valor: 12, etiqueta: '12 meses' },
  { valor: 24, etiqueta: '24 meses' },
]

const meses = ref(12)
const serie = ref([])
const totales = ref({ gastos: 0, ingresos: 0, ahorros: 0 })
const promedios = ref({ gastosMensual: 0, ingresosMensual: 0, ahorrosMensual: 0 })
const cargando = ref(true)
const recurrentes = ref([])
const cargandoRecurrentes = ref(true)

const serieInvertida = computed(() => [...serie.value].reverse())

const tasaAhorro = computed(() => {
  if (!totales.value.ingresos) return 0
  return ((totales.value.ingresos - totales.value.gastos) / totales.value.ingresos) * 100
})

const anchoColumna = 40
const anchoSvg = computed(() => Math.max(serie.value.length * anchoColumna, 320))

const maxValor = computed(() => {
  let max = 0
  for (const p of serie.value) {
    if (p.gastos > max) max = p.gastos
    if (p.ingresos > max) max = p.ingresos
  }
  return max || 1
})

function alturaBarra(valor) {
  if (!valor) return 0
  return Math.max(2, (valor / maxValor.value) * 180)
}

function etiquetaMes(m) {
  return (MESES[m - 1] || '').slice(0, 3)
}

async function cargar() {
  cargando.value = true
  try {
    const data = await apiFetch('/api/metricas/historico', { query: { meses: meses.value } })
    serie.value = data.serie || []
    totales.value = data.totales || { gastos: 0, ingresos: 0, ahorros: 0 }
    promedios.value = data.promedios || { gastosMensual: 0, ingresosMensual: 0, ahorrosMensual: 0 }
  } catch (e) {
    console.warn('[metricas] fallo al cargar:', e)
  } finally {
    cargando.value = false
  }
}

async function cargarRecurrentes() {
  cargandoRecurrentes.value = true
  try {
    const data = await apiFetch('/api/metricas/recurrentes', { query: { meses: 6 } })
    recurrentes.value = data.candidatos || []
  } catch (e) {
    console.warn('[metricas] fallo al cargar recurrentes:', e)
  } finally {
    cargandoRecurrentes.value = false
  }
}

function cambiarMeses(v) {
  if (v === meses.value) return
  meses.value = v
  cargar()
}

function exportarCsv() {
  if (!serie.value.length) return
  const headers = ['Anio', 'Mes', 'Ingresos', 'Gastos', 'Ahorros', 'Saldo']
  const filas = serie.value.map(p => [p.anio, p.mes, p.ingresos, p.gastos, p.ahorros, p.saldoNeto])
  const csv = [headers, ...filas].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `metricas-${meses.value}m.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  cargar()
  cargarRecurrentes()
})
</script>
