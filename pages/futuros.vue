<template>
  <div class="min-h-screen bg-theme-bg pb-24 lg:pb-10">
    <Transition name="ptr">
      <div v-if="isRefreshing" class="flex justify-center py-2">
        <svg class="h-5 w-5 animate-spin text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    </Transition>

    <header class="relative overflow-hidden border-b border-theme-border bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent px-4 pb-5 pt-6 lg:px-8 lg:pt-8">
      <div class="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl"></div>
      <div class="relative flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L23 12l-6.714 2.143L14 21l-2.286-6.857L5 12l6.714-2.143L14 3z" />
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-bold tracking-tight text-theme-text lg:text-2xl">Gastos Futuros</h1>
          <p class="text-xs text-theme-text-sec lg:text-sm">Deseos y decisiones pendientes</p>
        </div>
      </div>
    </header>

    <main class="px-4 pt-4 lg:px-8 lg:pt-6">
      <FuturosResumen class="mb-4" />
      <FuturosLista @editar="editarGastoFuturo" />
    </main>

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
