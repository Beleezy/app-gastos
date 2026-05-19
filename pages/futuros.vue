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

    <SharedFloatingActionStack>
      <SharedFloatingActionButton
        tone="violet"
        aria-label="Agregar gasto futuro"
        @click="abrirFormulario"
      />
    </SharedFloatingActionStack>

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

onMounted(() => {
  // Fire-and-forget: ambos composables tienen SWR cache, así que en
  // revisitas dentro del TTL no disparan red.
  Promise.all([fetchGastosFuturos(), fetchCategorias()]).catch(() => {})
})
</script>
