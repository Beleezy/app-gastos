<template>
  <div>
    <LayoutAppHeader>
      <template #title>Planificador Mensual</template>
    </LayoutAppHeader>

    <!-- Pull-to-refresh indicator -->
    <Transition name="ptr">
      <div v-if="isRefreshing" class="flex justify-center py-2">
        <svg class="animate-spin w-5 h-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    </Transition>

    <!-- Month Summary (swipeable) -->
    <div ref="swipeZone">
      <PlanificadorResumenMes />
    </div>

    <!-- Vista toggle + Export -->
    <div class="px-4 mb-2 flex gap-2">
      <!-- Vista: Lista / Calendario / Gráfico -->
      <div class="flex-1 flex gap-1 bg-primary-800/40 border border-primary-700/20 rounded-xl p-1">
        <button
          v-for="v in vistas"
          :key="v.value"
          class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="vistaActual === v.value ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500'"
          @click="vistaActual = v.value"
        >{{ v.label }}</button>
      </div>
      <button
        class="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-800/40 text-gray-500 border border-primary-700/20 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
        @click="exportarPlanificador"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Excel
      </button>
    </div>

    <!-- Vistas -->
    <PlanificadorGraficoCategoria v-if="vistaActual === 'grafico'" />
    <PlanificadorCalendarioMensual v-else-if="vistaActual === 'calendario'" />
    <PlanificadorListaGastosPlaneados v-else @editar="editarGasto" />

    <!-- FAB - Floating Action Button -->
    <button
      class="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/50 to-indigo-600/50 hover:from-blue-400/65 hover:to-indigo-500/65 active:scale-90 shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all duration-300 fab-pulse backdrop-blur-md"
      @click="showForm = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <!-- Form Modal -->
    <PlanificadorFormGastoPlaneado
      v-if="showForm"
      :gasto-editar="gastoEditando"
      @close="cerrarForm"
      @saved="cerrarForm"
    />
  </div>
</template>

<script setup>
const { fetchPlan, fetchCategorias, gastosPlaneados, nombreMes, anioActual, mesAnterior, mesSiguiente } = usePlanificador()
const { currencySymbol } = useCurrency()
const { exportarExcel } = useExportExcel()

const showForm = ref(false)
const gastoEditando = ref(null)

const vistas = [
  { value: 'lista', label: 'Lista' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'grafico', label: 'Gráfico' },
]
const vistaActual = ref('lista')

function exportarPlanificador() {
  const columnas = [
    { label: 'Concepto', getValue: g => g.concepto },
    { label: 'Categoría', getValue: g => g.categoriaNombre || '' },
    { label: 'Monto Estimado', getValue: g => g.montoEstimado },
    { label: 'Fecha Probable', getValue: g => g.fechaProbablePago },
    { label: 'Estado', getValue: g => g.estado },
    { label: 'Recurrente', getValue: g => g.esRecurrente ? 'Sí' : 'No' },
    { label: 'Notas', getValue: g => g.notas || '' },
  ]
  exportarExcel(`planificador_${nombreMes.value}_${anioActual.value}`, columnas, gastosPlaneados.value)
}

function editarGasto(gasto) {
  gastoEditando.value = gasto
  showForm.value = true
}

function cerrarForm() {
  showForm.value = false
  gastoEditando.value = null
}

const { isRefreshing } = usePullToRefresh(async () => {
  await Promise.all([fetchPlan(), fetchCategorias()])
})

const swipeZone = ref(null)
const { attach: attachSwipe, detach: detachSwipe } = useSwipeMonth(mesAnterior, mesSiguiente)

onMounted(async () => {
  await Promise.all([fetchPlan(), fetchCategorias()])
  attachSwipe(swipeZone.value)
})

onUnmounted(() => detachSwipe(swipeZone.value))
</script>
