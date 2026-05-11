<template>
  <div>
    <Transition name="ptr">
      <div v-if="isRefreshing" class="flex justify-center py-2">
        <svg class="h-5 w-5 animate-spin text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    </Transition>

    <div class="lg:mt-4">
      <FuturosResumen class="mx-4 lg:mx-0 mb-3" />
      <FuturosLista @editar="editarGastoFuturo" />
    </div>

    <button
      class="fab-pulse fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 opacity-90 shadow-lg shadow-violet-500/30 transition-all duration-300 hover:bg-violet-600 active:scale-90"
      @click="abrirFormulario"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <FuturosForm
      v-if="showForm"
      :gasto-editar="gastoEditando"
      @close="cerrarForm"
      @saved="cerrarForm"
    />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'planificador' })

const { fetchGastosFuturos } = useGastosFuturos()
const { fetchCategorias } = usePlanificador()

const showForm = ref(false)
const gastoEditando = ref(null)

function editarGastoFuturo(gasto) {
  gastoEditando.value = gasto
  showForm.value = true
}

function abrirFormulario() {
  gastoEditando.value = null
  showForm.value = true
}

function cerrarForm() {
  showForm.value = false
  gastoEditando.value = null
}

const { isRefreshing } = usePullToRefresh(async () => {
  await fetchGastosFuturos()
})

onMounted(async () => {
  await Promise.all([fetchGastosFuturos(), fetchCategorias()])
})
</script>
