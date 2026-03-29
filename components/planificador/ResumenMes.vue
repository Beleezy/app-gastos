<template>
  <div class="px-4 pt-4 pb-2">
    <!-- Month Selector -->
    <div class="flex items-center justify-between mb-4">
      <button class="p-2 rounded-lg bg-primary-800 text-gray-400 active:bg-primary-700 transition-colors" @click="mesAnterior">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="text-center">
        <h2 class="text-lg font-semibold text-white">{{ nombreMes }} {{ anioActual }}</h2>
        <p v-if="esHoy" class="text-xs text-gray-400">Mes actual</p>
      </div>
      <button class="p-2 rounded-lg bg-primary-800 text-gray-400 active:bg-primary-700 transition-colors" @click="mesSiguiente">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Budget Summary Card -->
    <div class="bg-primary-800 rounded-2xl p-4 space-y-4">
      <!-- Income / Budget -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm text-gray-400">Presupuesto</span>
        </div>
        <!-- Editable budget -->
        <div v-if="editandoPresupuesto" class="flex items-center gap-1">
          <span class="text-sm text-gray-400">S/</span>
          <input
            ref="inputPresupuesto"
            v-model="presupuestoTemp"
            type="number"
            step="0.01"
            class="w-28 bg-primary-900 border border-indigo-500 rounded-lg px-2 py-1 text-right text-white text-lg font-bold focus:outline-none"
            @keyup.enter="guardarPresupuesto"
            @blur="guardarPresupuesto"
          />
        </div>
        <button v-else class="text-lg font-bold text-white hover:text-indigo-300 transition-colors" @click="iniciarEdicion">
          S/ {{ formatMonto(resumen.presupuesto) }}
        </button>
      </div>

      <!-- Divider -->
      <div class="border-t border-primary-700/50"></div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-primary-900/50 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Gastos planificados</p>
          <p class="text-base font-semibold text-orange-400">S/ {{ formatMonto(resumen.totalPlanificado) }}</p>
        </div>
        <div class="bg-primary-900/50 rounded-xl p-3">
          <p class="text-xs text-gray-500 mb-1">Saldo restante</p>
          <p class="text-base font-semibold" :class="resumen.saldoRestante >= 0 ? 'text-emerald-400' : 'text-red-400'">
            S/ {{ formatMonto(resumen.saldoRestante) }}
          </p>
        </div>
      </div>

      <!-- Progress Bar -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-gray-400">Presupuesto asignado</span>
          <span class="text-xs font-medium" :class="resumen.porcentajeAsignado > 90 ? 'text-red-400' : 'text-indigo-400'">
            {{ resumen.porcentajeAsignado.toFixed(1) }}%
          </span>
        </div>
        <div class="w-full h-2.5 bg-primary-900/80 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="resumen.porcentajeAsignado > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'"
            :style="{ width: resumen.porcentajeAsignado + '%' }"
          ></div>
        </div>
      </div>

      <!-- Paid vs Pending mini stats -->
      <div class="flex items-center gap-4 pt-1">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="text-xs text-gray-400">Pagados: <span class="text-emerald-400 font-medium">{{ resumen.countPagados }}</span></span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-orange-400"></span>
          <span class="text-xs text-gray-400">Pendientes: <span class="text-orange-400 font-medium">{{ resumen.countPendientes }}</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const {
  mesActual, anioActual, nombreMes, esHoy,
  resumen, mesSiguiente, mesAnterior, updatePresupuesto, fetchPlan
} = usePlanificador()

const editandoPresupuesto = ref(false)
const presupuestoTemp = ref(0)
const inputPresupuesto = ref(null)

watch([mesActual, anioActual], () => {
  fetchPlan()
})

function formatMonto(valor) {
  return Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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
