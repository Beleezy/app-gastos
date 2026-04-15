<template>
  <div class="px-4 py-2">
    <!-- Cabecera días de la semana -->
    <div class="grid grid-cols-7 mb-1">
      <div v-for="d in DIAS" :key="d" class="text-center text-[10px] font-semibold text-theme-text-sec py-1">
        {{ d }}
      </div>
    </div>

    <!-- Grilla de días -->
    <div class="grid grid-cols-7 gap-1">
      <!-- Celdas vacías antes del día 1 -->
      <div v-for="_ in primerDiaSemana" :key="'e-' + _" class="h-16"></div>

      <!-- Días del mes -->
      <button
        v-for="dia in diasEnMesTotal"
        :key="dia"
        type="button"
        class="h-16 rounded-xl p-1 flex flex-col items-stretch border text-left transition-all active:scale-95"
        :class="claseDia(dia)"
        @click="seleccionarDia(dia)"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-[10px] font-semibold leading-none"
            :class="claseNumero(dia)"
          >{{ dia }}</span>
          <span
            v-if="gastosDelDia(dia).length > 0 && !esDiaSeleccionado(dia)"
            class="text-[8px] font-semibold leading-none"
            :class="esVencidoDia(dia) ? 'text-red-400' : 'text-theme-text-muted'"
          >{{ formatCompact(totalDia(dia)) }}</span>
        </div>

        <!-- Dots por categoría -->
        <div class="flex flex-wrap gap-[2px] mt-1 overflow-hidden flex-1 content-start">
          <span
            v-for="(g, i) in gastosDelDia(dia).slice(0, 6)"
            :key="g.id + '-' + i"
            class="w-1.5 h-1.5 rounded-full"
            :style="{ backgroundColor: g.categoriaColor || '#6b7280' }"
          ></span>
          <span v-if="gastosDelDia(dia).length > 6" class="text-[8px] text-theme-text-muted leading-none">+{{ gastosDelDia(dia).length - 6 }}</span>
        </div>
      </button>
    </div>

    <!-- Panel de día seleccionado -->
    <div v-if="diaSel" class="mt-4 rounded-2xl bg-theme-card border border-theme-border overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2.5 border-b border-theme-border">
        <div>
          <p class="text-xs font-semibold text-theme-text">{{ tituloDiaSel }}</p>
          <p class="text-[10px] text-theme-text-muted">
            {{ gastosDelDia(diaSel).length }} gasto{{ gastosDelDia(diaSel).length === 1 ? '' : 's' }}
            ·
            {{ currencySymbol }} {{ formatMonto(totalDia(diaSel)) }}
          </p>
        </div>
        <button
          class="w-7 h-7 rounded-full text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors flex items-center justify-center"
          @click="diaSel = null"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div v-if="gastosDelDia(diaSel).length === 0" class="px-3 py-6 text-center">
        <p class="text-xs text-theme-text-sec">Sin gastos planificados este día</p>
      </div>
      <div v-else class="divide-y divide-theme-border">
        <div
          v-for="g in gastosDelDia(diaSel)"
          :key="g.id"
          class="flex items-center justify-between gap-2 px-3 py-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: g.categoriaColor || '#6b7280' }"></span>
            <div class="min-w-0">
              <p class="text-xs text-theme-text truncate">{{ g.concepto }}</p>
              <p class="text-[10px] text-theme-text-muted truncate">{{ g.categoriaNombre || 'Sin categoría' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span
              class="text-[9px] px-1.5 py-0.5 rounded-full"
              :class="g.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'"
            >{{ g.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}</span>
            <span class="text-xs font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(g.montoEstimado) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Spacer FAB -->
    <div class="h-20"></div>
  </div>
</template>

<script setup>
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const { gastosPlaneados, mesActual, anioActual } = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()

const diasEnMesTotal = computed(() => new Date(anioActual.value, mesActual.value, 0).getDate())

// 0=Lunes … 6=Domingo offset para la grilla (semana empieza en Lunes)
const primerDiaSemana = computed(() => {
  const jsDay = new Date(anioActual.value, mesActual.value - 1, 1).getDay()
  return jsDay === 0 ? 6 : jsDay - 1
})

const hoy = new Date()
function esHoy(dia) {
  return (
    hoy.getDate() === dia &&
    hoy.getMonth() + 1 === mesActual.value &&
    hoy.getFullYear() === anioActual.value
  )
}

function esPasado(dia) {
  const hoyD = new Date(); hoyD.setHours(0, 0, 0, 0)
  const d = new Date(anioActual.value, mesActual.value - 1, dia)
  return d < hoyD
}

const gastosConFecha = computed(() =>
  gastosPlaneados.value
    .filter(g => g.fechaProbablePago)
    .sort((a, b) => (a.fechaProbablePago || '').localeCompare(b.fechaProbablePago || ''))
)

function gastosDelDia(dia) {
  return gastosConFecha.value.filter(g => extraerDia(g.fechaProbablePago) === dia)
}

function totalDia(dia) {
  return gastosDelDia(dia).reduce((s, g) => s + (g.montoEstimado || 0), 0)
}

function esVencidoDia(dia) {
  return esPasado(dia) && gastosDelDia(dia).some(g => g.estado === 'pendiente')
}

function extraerDia(fecha) {
  if (!fecha) return 0
  return parseInt(fecha.split('-')[2])
}

function formatCompact(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return Math.round(n).toString()
}

// Selección de día
const diaSel = ref(null)
function seleccionarDia(dia) { diaSel.value = diaSel.value === dia ? null : dia }
function esDiaSeleccionado(dia) { return diaSel.value === dia }

// Reset cuando cambia el mes
watch([mesActual, anioActual], () => { diaSel.value = null })

const tituloDiaSel = computed(() => {
  if (!diaSel.value) return ''
  const d = new Date(anioActual.value, mesActual.value - 1, diaSel.value)
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${diasSemana[d.getDay()]} ${diaSel.value} de ${meses[d.getMonth()]}`
})

function claseDia(dia) {
  const sel = esDiaSeleccionado(dia)
  if (sel) return 'bg-theme-accent/20 border-theme-accent ring-2 ring-theme-accent/40'
  if (esHoy(dia)) return 'bg-theme-accent-bg border-theme-accent'
  if (esVencidoDia(dia)) return 'bg-red-500/8 border-red-500/30'
  if (gastosDelDia(dia).length > 0) return 'bg-theme-card border-theme-border'
  return 'bg-transparent border-transparent'
}

function claseNumero(dia) {
  if (esHoy(dia)) return 'text-theme-accent'
  if (esVencidoDia(dia)) return 'text-red-400'
  return 'text-theme-text-sec'
}
</script>
