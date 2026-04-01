<template>
  <div>
    <LayoutAppHeader>
      <template #title>Planificador Mensual</template>
    </LayoutAppHeader>

    <!-- Month Summary -->
    <PlanificadorResumenMes />

    <!-- Chart toggle + Export -->
    <div class="px-4 mb-2 flex gap-2">
      <button
        class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
        :class="showChart ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
        @click="showChart = !showChart"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        {{ showChart ? 'Ocultar' : 'Grafico' }}
      </button>
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

    <!-- Chart (toggle) -->
    <PlanificadorGraficoCategoria v-if="showChart" />

    <!-- Expense List -->
    <PlanificadorListaGastosPlaneados @editar="editarGasto" />

    <!-- FAB - Floating Action Button -->
    <button
      class="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 active:scale-90 shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all duration-300 fab-pulse"
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
const { fetchPlan, fetchCategorias, gastosPlaneados, nombreMes, anioActual } = usePlanificador()
const { currencySymbol } = useCurrency()
const { exportarExcel } = useExportExcel()

const showForm = ref(false)
const showChart = ref(false)
const gastoEditando = ref(null)

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

onMounted(async () => {
  await Promise.all([fetchPlan(), fetchCategorias()])
})
</script>
