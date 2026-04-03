<template>
  <div class="px-4 pt-4 pb-2">
    <!-- Month Selector -->
    <div class="flex items-center justify-between mb-4">
      <button class="p-2.5 rounded-xl bg-primary-800/80 text-gray-400 active:bg-primary-700 active:scale-95 transition-all border border-primary-700/20" @click="mesAnterior">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="text-center">
        <h2 class="text-lg font-bold text-white">{{ nombreMes }} {{ anioActual }}</h2>
        <p v-if="esHoy" class="text-[10px] text-blue-400/70 font-medium mt-0.5">Mes actual</p>
      </div>
      <button class="p-2.5 rounded-xl bg-primary-800/80 text-gray-400 active:bg-primary-700 active:scale-95 transition-all border border-primary-700/20" @click="mesSiguiente">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Budget Summary Card -->
    <div class="relative bg-gradient-to-br from-primary-800 to-primary-800/90 rounded-2xl p-4 space-y-4 border border-primary-700/20 overflow-hidden">
      <!-- Decorative accent -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

      <!-- Income / Budget -->
      <div class="relative flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/25 to-indigo-500/15 flex items-center justify-center">
            <span class="text-xs font-bold text-blue-400 leading-none">S/</span>
          </div>
          <span class="text-sm text-gray-400">Presupuesto</span>
        </div>
        <!-- Editable budget -->
        <div v-if="editandoPresupuesto" class="flex items-center gap-1">
          <span class="text-sm text-gray-400">{{ currencySymbol }}</span>
          <input
            ref="inputPresupuesto"
            v-model="presupuestoTemp"
            type="number"
            step="0.01"
            class="w-28 bg-primary-900 border border-blue-500 rounded-lg px-2 py-1 text-right text-white text-lg font-bold focus:outline-none"
            @keyup.enter="guardarPresupuesto"
            @blur="guardarPresupuesto"
          />
        </div>
        <button v-else class="text-lg font-bold text-white hover:text-blue-300 transition-colors whitespace-nowrap" @click="iniciarEdicion">
          {{ currencySymbol }} {{ formatMonto(resumen.presupuesto) }}
        </button>
      </div>

      <!-- Divider -->
      <div class="border-t border-primary-700/30"></div>

      <!-- Stats Row -->
      <div class="relative grid grid-cols-3 gap-2">
        <div class="bg-primary-900/40 rounded-xl p-3 border border-orange-500/5">
          <p class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Planificado</p>
          <p class="text-sm font-bold text-orange-400 whitespace-nowrap">{{ formatMonto(resumen.totalPlanificado) }}</p>
        </div>
        <div class="bg-primary-900/40 rounded-xl p-3 border" :class="totalGastoReal > resumen.totalPlanificado ? 'border-red-500/10' : 'border-emerald-500/5'">
          <p class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Gastado</p>
          <p class="text-sm font-bold whitespace-nowrap" :class="totalGastoReal > resumen.totalPlanificado ? 'text-red-400' : 'text-emerald-400'">
            {{ formatMonto(totalGastoReal) }}
          </p>
        </div>
        <div class="bg-primary-900/40 rounded-xl p-3 border" :class="resumen.saldoRestante >= 0 ? 'border-emerald-500/5' : 'border-red-500/10'">
          <p class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Saldo</p>
          <p class="text-sm font-bold whitespace-nowrap" :class="resumen.saldoRestante >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ formatMonto(resumen.saldoRestante) }}
          </p>
        </div>
      </div>

      <!-- Progress Bar -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-400">Presupuesto asignado</span>
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="resumen.porcentajeAsignado > 90 ? 'text-red-400 bg-red-500/10' : 'text-blue-400 bg-blue-500/10'"
          >
            {{ resumen.porcentajeAsignado.toFixed(1) }}%
          </span>
        </div>
        <div class="w-full h-2 bg-primary-900/60 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            :class="resumen.porcentajeAsignado > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400'"
            :style="{ width: Math.min(resumen.porcentajeAsignado, 100) + '%' }"
          ></div>
        </div>
      </div>

      <!-- Paid vs Pending mini stats -->
      <div class="flex items-center justify-between pt-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 bg-emerald-500/8 px-2 py-1 rounded-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span class="text-[11px] text-gray-400">Pagados: <span class="text-emerald-400 font-semibold">{{ resumen.countPagados }}</span></span>
          </div>
          <div class="flex items-center gap-1.5 bg-orange-500/8 px-2 py-1 rounded-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span class="text-[11px] text-gray-400">Pendientes: <span class="text-orange-400 font-semibold">{{ resumen.countPendientes }}</span></span>
          </div>
        </div>
        <!-- Duplicar mes anterior -->
        <button
          v-if="gastosPlaneados.length === 0"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 active:scale-95 transition-all border border-blue-500/10"
          :disabled="duplicando"
          @click="duplicarMesAnterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          {{ duplicando ? 'Copiando...' : 'Copiar mes anterior' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const {
  mesActual, anioActual, nombreMes, esHoy,
  resumen, gastosPlaneados, mesSiguiente, mesAnterior, updatePresupuesto, fetchPlan, duplicarMes, totalGastoReal
} = usePlanificador()

const duplicando = ref(false)

async function duplicarMesAnterior() {
  let mesOrigen = mesActual.value - 1
  let anioOrigen = anioActual.value
  if (mesOrigen === 0) {
    mesOrigen = 12
    anioOrigen--
  }
  duplicando.value = true
  try {
    await duplicarMes(mesOrigen, anioOrigen)
  } catch { /* error handled in composable */ }
  finally { duplicando.value = false }
}

const editandoPresupuesto = ref(false)
const presupuestoTemp = ref(0)
const inputPresupuesto = ref(null)

watch([mesActual, anioActual], () => {
  fetchPlan()
})

const { currencySymbol, formatMonto } = useCurrency()

function iniciarEdicion() {
  presupuestoTemp.value = resumen.value.presupuesto
  editandoPresupuesto.value = true
  nextTick(() => {
    inputPresupuesto.value?.focus()
    inputPresupuesto.value?.select()
  })
}

async function guardarPresupuesto() {
  const monto = parseFloat(presupuestoTemp.value)
  if (!isNaN(monto) && monto >= 0) {
    await updatePresupuesto(monto)
  }
  editandoPresupuesto.value = false
}
</script>
