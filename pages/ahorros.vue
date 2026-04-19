<template>
  <div>
    <LayoutAppHeader>
      <template #title>Ahorros</template>
      <template #actions>
        <NuxtLink
          to="/planificador"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-theme-text-sec hover:text-theme-accent text-xs transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Planificador
        </NuxtLink>
      </template>
    </LayoutAppHeader>

    <Transition name="ptr">
      <div v-if="isRefreshing" class="flex justify-center py-2">
        <svg class="h-5 w-5 animate-spin text-theme-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    </Transition>

    <div class="lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] lg:gap-6 lg:mt-4">
      <div class="lg:sticky lg:top-20 lg:self-start">
        <div ref="swipeZone">
          <AhorrosResumenAhorros @abrir-metas="showFormMeta = true" />
        </div>
      </div>

      <div class="space-y-4">
        <AhorrosFiltrosBar
          :model-busqueda="busquedaAhorro"
          :rango-activo="rangoRapido"
          :rangos-rapidos="rangosRapidos"
          :medio-activo="medioFiltro"
          :medios="medios"
          :tiene-filtros-activos="tieneFiltrosActivos"
          :conteo-filtros-activos="conteoFiltrosActivos"
          @update:busqueda="busquedaAhorro = $event"
          @update:rango="rangoRapido = $event"
          @update:medio="medioFiltro = $event"
          @limpiar="limpiarFiltros"
        />

        <div class="flex items-center gap-2 px-4 lg:px-0">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="flex-1 lg:flex-none lg:px-5 py-2 rounded-xl text-sm font-medium transition-colors"
            :class="vistaAhorros === tab.value ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
            @click="cambiarTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <Transition name="page" mode="out-in">
          <div :key="vistaAhorros">
            <AhorrosTabPorMedio
              v-if="vistaAhorros === 'medios'"
              :por-medio-filtrado="porMedioFiltrado"
              :total-filtrado="totalFiltrado"
              @editar="editarAhorro"
              @eliminar="confirmarEliminar"
            />
            <AhorrosTabSeisMeses
              v-else
              @editar="editarAhorro"
              @eliminar="confirmarEliminar"
            />
          </div>
        </Transition>
      </div>
    </div>

    <!-- FAB -->
    <button
      class="fab-pulse fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 opacity-70 shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:opacity-85 active:scale-90"
      @click="showFormAhorro = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <!-- Forms -->
    <AhorrosFormAhorro
      v-if="showFormAhorro"
      :ahorro-editar="ahorroEditando"
      @close="cerrarFormAhorro"
      @saved="cerrarFormAhorro"
      @gestionar-medios="showFormMedio = true"
    />

    <AhorrosFormMedioAhorro
      v-if="showFormMedio"
      @close="showFormMedio = false"
    />

    <AhorrosFormMetaAhorro
      v-if="showFormMeta"
      @close="showFormMeta = false"
      @saved="showFormMeta = false"
    />

    <SharedConfirmDialog
      v-model="showConfirmDelete"
      title="Eliminar ahorro"
      message="¿Estás seguro de eliminar este ahorro?"
      confirm-label="Eliminar"
      @confirm="ejecutarEliminar"
    />
  </div>
</template>

<script setup>
const {
  ahorrosList, medios,
  fetchAhorros, fetchMedios, deleteAhorro,
  mesActual, anioActual, esHoy,
  mesSiguiente, mesAnterior,
  mesSeleccionadoGrafico, fetchAhorrosMes,
} = useAhorros()

const esMesActual = computed(() => esHoy.value)

const {
  busquedaAhorro, medioFiltro, rangoRapido, rangosRapidos,
  porMedioFiltrado, totalFiltrado,
  tieneFiltrosActivos, conteoFiltrosActivos, limpiarFiltros,
} = useAhorrosFilters({ ahorrosList, esMesActual })

const { success, error: toastError } = useToast()
const { vibrate } = useHaptic()

const showFormAhorro = ref(false)
const showFormMedio = ref(false)
const showFormMeta = ref(false)
const ahorroEditando = ref(null)
const ahorroParaEliminar = ref(null)
const showConfirmDelete = ref(false)

const vistaAhorros = ref('medios')
const tabs = [
  { value: 'medios', label: 'Por medio' },
  { value: 'graficos', label: '6 meses' },
]

function cambiarTab(v) {
  vibrate(10)
  vistaAhorros.value = v
}

function editarAhorro(ahorro) {
  ahorroEditando.value = ahorro
  showFormAhorro.value = true
}

function cerrarFormAhorro() {
  showFormAhorro.value = false
  ahorroEditando.value = null
}

function confirmarEliminar(ahorro) {
  ahorroParaEliminar.value = ahorro
  showConfirmDelete.value = true
}

async function ejecutarEliminar() {
  if (!ahorroParaEliminar.value) return
  try {
    await deleteAhorro(ahorroParaEliminar.value.id)
    if (mesSeleccionadoGrafico.value &&
        (mesSeleccionadoGrafico.value.mes !== mesActual.value ||
         mesSeleccionadoGrafico.value.anio !== anioActual.value)) {
      await fetchAhorrosMes(mesSeleccionadoGrafico.value.mes, mesSeleccionadoGrafico.value.anio)
    }
    success('Ahorro eliminado')
  } catch (e) {
    toastError('Error al eliminar')
  } finally {
    ahorroParaEliminar.value = null
    showConfirmDelete.value = false
  }
}

const { isRefreshing } = usePullToRefresh(async () => {
  await Promise.all([fetchAhorros(), fetchMedios()])
})

const swipeZone = ref(null)
const attachedSwipeEl = ref(null)
const { attach: attachSwipe, detach: detachSwipe } = useSwipeMonth(mesAnterior, mesSiguiente)

watch([mesActual, anioActual], () => {
  fetchAhorros()
})

onMounted(async () => {
  await Promise.all([fetchAhorros(), fetchMedios()])
  if (swipeZone.value) {
    attachSwipe(swipeZone.value)
    attachedSwipeEl.value = swipeZone.value
  }
})

onUnmounted(() => {
  if (attachedSwipeEl.value) {
    detachSwipe(attachedSwipeEl.value)
  }
})
</script>

<style scoped>
.page-enter-active, .page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from, .page-leave-to {
  opacity: 0;
}
</style>
