<template>
  <div class="px-4 py-2">
    <!-- Cabecera días de la semana -->
    <div class="grid grid-cols-7 mb-1">
      <div v-for="d in DIAS" :key="d" class="text-center text-[10px] font-semibold text-gray-500 py-1">
        {{ d }}
      </div>
    </div>

    <!-- Grilla de días -->
    <div class="grid grid-cols-7 gap-y-1">
      <!-- Celdas vacías antes del día 1 -->
      <div v-for="_ in primerDiaSemana" :key="'e-' + _" class="h-14"></div>

      <!-- Días del mes -->
      <div
        v-for="dia in diasEnMes"
        :key="dia"
        class="h-14 rounded-xl p-1 flex flex-col border transition-colors"
        :class="[
          esHoy(dia)
            ? 'bg-theme-accent-bg border-theme-accent'
            : gastosDelDia(dia).length > 0
              ? 'bg-primary-800/80 border-primary-700/30'
              : 'bg-transparent border-transparent',
        ]"
      >
        <!-- Número de día -->
        <span
          class="text-[10px] font-semibold leading-none mb-0.5"
          :class="esHoy(dia) ? 'text-theme-accent' : 'text-gray-500'"
        >{{ dia }}</span>

        <!-- Puntos de gastos (máx 2 visibles + overflow) -->
        <div class="flex flex-col gap-0.5 overflow-hidden flex-1">
          <template v-for="(g, i) in gastosDelDia(dia).slice(0, 2)" :key="g.id">
            <div
              class="w-full h-2.5 rounded-sm text-[7px] leading-none px-0.5 truncate font-medium flex items-center"
              :style="{ backgroundColor: g.categoriaColor + '30', color: g.categoriaColor }"
              :title="g.concepto + ' S/' + g.montoEstimado"
            >{{ g.concepto }}</div>
          </template>
          <div v-if="gastosDelDia(dia).length > 2" class="text-[7px] text-gray-600 leading-none pl-0.5">
            +{{ gastosDelDia(dia).length - 2 }} más
          </div>
        </div>
      </div>
    </div>

    <!-- Leyenda: total de gastos con fecha -->
    <div v-if="gastosConFecha.length > 0" class="mt-4 space-y-1">
      <p class="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Gastos con fecha programada</p>
      <div
        v-for="g in gastosConFecha"
        :key="g.id"
        class="flex items-center justify-between px-3 py-2 rounded-lg bg-primary-800/60 border border-primary-700/20"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :style="{ backgroundColor: g.categoriaColor || '#6b7280' }"
          ></span>
          <p class="text-xs text-gray-300 truncate">{{ g.concepto }}</p>
          <span
            class="text-[9px] px-1 py-0.5 rounded shrink-0"
            :class="g.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'"
          >{{ g.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}</span>
        </div>
        <div class="text-right shrink-0 ml-2">
          <p class="text-xs font-semibold text-white">{{ currencySymbol }} {{ formatMonto(g.montoEstimado) }}</p>
          <p class="text-[10px] text-gray-500">día {{ extraerDia(g.fechaProbablePago) }}</p>
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

const diasEnMes = computed(() => new Date(anioActual.value, mesActual.value, 0).getDate())

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

const gastosConFecha = computed(() =>
  gastosPlaneados.value
    .filter(g => g.fechaProbablePago)
    .sort((a, b) => (a.fechaProbablePago || '').localeCompare(b.fechaProbablePago || ''))
)

function gastosDelDia(dia) {
  return gastosConFecha.value.filter(g => extraerDia(g.fechaProbablePago) === dia)
}

function extraerDia(fecha) {
  if (!fecha) return 0
  return parseInt(fecha.split('-')[2])
}
</script>
