<template>
  <div>
    <LayoutAppHeader>
      <template #title>Planificador Mensual</template>
      <template #actions>
        <button
          class="w-8 h-8 rounded-lg bg-primary-700/50 flex items-center justify-center text-gray-400 active:bg-primary-700 transition-colors"
          @click="showChart = !showChart"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </button>
      </template>
    </LayoutAppHeader>

    <!-- Month Summary -->
    <PlanificadorResumenMes />

    <!-- Chart (toggle) -->
    <PlanificadorGraficoCategoria v-if="showChart" />

    <!-- Expense List -->
    <PlanificadorListaGastosPlaneados @editar="editarGasto" />

    <!-- FAB - Floating Action Button -->
    <button
      class="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all active:scale-95"
      @click="showForm = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
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
const { fetchPlan, fetchCategorias } = usePlanificador()

const showForm = ref(false)
const showChart = ref(false)
const gastoEditando = ref(null)

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
