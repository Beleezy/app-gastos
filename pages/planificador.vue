<template>
  <div>
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
          <component
            :is="PlanificadorResumenMes"
            @exportar="exportarPlanificador"
            @abrir-plantillas="showPlantillas = true"
            @abrir-presupuestos="showPresupuestos = true"
          />
        </div>
      </div>

      <div>
        <div class="mb-2 px-4 lg:px-0">
          <div class="flex items-center gap-1 rounded-xl border border-theme-border bg-theme-card p-1">
            <button
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors"
              :class="vistaActual === 'lista' ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-text-sec'"
              @click="vistaActual = 'lista'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Lista
              <span v-if="vistaActual === 'lista'" class="text-[0.6875rem] font-bold bg-theme-accent/20 px-1.5 rounded-full">{{ gastosPlaneados.length }}</span>
            </button>
            <button
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors"
              :class="vistaActual === 'calendario' ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-text-sec'"
              @click="vistaActual = 'calendario'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendario
            </button>
            <button
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors"
              :class="vistaActual === 'grafico' ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-text-sec'"
              @click="vistaActual = 'grafico'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              Gráfico
            </button>
          </div>
        </div>

        <Transition name="page" mode="out-in">
          <div :key="vistaActual">
            <LazyPlanificadorGraficoCategoria
              v-if="vistaActual === 'grafico'"
              @editar="editarGastoPlaneado"
              @registrar="abrirRegistroPago"
            />
            <component
              v-else-if="vistaActual === 'calendario'"
              :is="LazyPlanificadorCalendarioMensual"
              @editar="editarGastoPlaneado"
              @registrar="abrirRegistroPago"
            />
            <component
              v-else
              :is="PlanificadorListaGastosPlaneados"
              @editar="editarGastoPlaneado"
              @registrar="abrirRegistroPago"
            />
          </div>
        </Transition>
      </div>
    </div>

    <SharedFloatingActionStack>
      <SharedFloatingActionButton
        tone="accent"
        aria-label="Agregar gasto planificado"
        @click="abrirFormulario"
      />
    </SharedFloatingActionStack>

    <LazyPlanificadorFormGastoPlaneado
      v-if="showFormMensual"
      :gasto-editar="gastoMensualEditando"
      @close="cerrarFormMensual"
      @saved="cerrarFormMensual"
    />

    <LazyPlanificadorFormRegistrarPago
      v-if="showFormRegistrarPago && gastoParaRegistrar"
      :gasto="gastoParaRegistrar"
      @close="cerrarFormRegistrarPago"
      @saved="cerrarFormRegistrarPago"
    />

    <SharedBaseBottomSheet
      v-if="showPlantillas"
      title="Plantillas del mes"
      @close="showPlantillas = false"
    >
      <LazyPlanificadorSelectorPlantillas
        :plan-mensual-id="plan?.id || null"
        @aplicada="onPlantillaAplicadaFromSheet"
      />
    </SharedBaseBottomSheet>

    <SharedBaseBottomSheet
      v-if="showPresupuestos"
      title="Topes por categoría"
      @close="showPresupuestos = false"
    >
      <LazyPlanificadorPresupuestosCategoria />
    </SharedBaseBottomSheet>
  </div>
</template>

<script setup>
import PlanificadorResumenMes from '~/components/planificador/ResumenMes.vue'
import PlanificadorListaGastosPlaneados from '~/components/planificador/ListaGastosPlaneados.vue'

const LazyPlanificadorCalendarioMensual = defineAsyncComponent(() =>
  import('~/components/planificador/CalendarioMensual.vue')
)

definePageMeta({ layout: 'planificador' })

const route = useRoute()

if (route.query.seccion === 'futuros') {
  await navigateTo('/futuros', { replace: true })
}

const {
  fetchPlan,
  fetchCategorias,
  plan,
  gastosPlaneados,
  nombreMes,
  anioActual,
  mesAnterior,
  mesSiguiente,
} = usePlanificador()

async function onPlantillaAplicada() {
  await fetchPlan()
}
const { exportarExcel } = useExportExcel()

const showFormMensual = ref(false)
const showFormRegistrarPago = ref(false)
const showPlantillas = ref(false)
useOverlayBack(showPlantillas, () => { showPlantillas.value = false })
const showPresupuestos = ref(false)
useOverlayBack(showPresupuestos, () => { showPresupuestos.value = false })

async function onPlantillaAplicadaFromSheet() {
  showPlantillas.value = false
  await onPlantillaAplicada()
}
const gastoMensualEditando = ref(null)
const gastoParaRegistrar = ref(null)

const vistaActual = ref('lista')

function exportarPlanificador() {
  const columnas = [
    { label: 'Concepto', getValue: g => g.concepto },
    { label: 'Categoria', getValue: g => g.categoriaNombre || '' },
    { label: 'Monto Estimado', getValue: g => g.montoEstimado },
    { label: 'Fecha Probable', getValue: g => g.fechaProbablePago },
    { label: 'Estado', getValue: g => g.estado },
    { label: 'Recurrente', getValue: g => g.esRecurrente ? 'Si' : 'No' },
    { label: 'Notas', getValue: g => g.notas || '' },
  ]
  exportarExcel(`planificador_${nombreMes.value}_${anioActual.value}`, columnas, gastosPlaneados.value)
}

function editarGastoPlaneado(gasto) {
  gastoMensualEditando.value = gasto
  showFormMensual.value = true
}

function abrirFormulario() {
  showFormMensual.value = true
}

function cerrarFormMensual() {
  showFormMensual.value = false
  gastoMensualEditando.value = null
}

function abrirRegistroPago(gasto) {
  gastoParaRegistrar.value = gasto
  showFormRegistrarPago.value = true
}

function cerrarFormRegistrarPago() {
  showFormRegistrarPago.value = false
  gastoParaRegistrar.value = null
}

const { isRefreshing } = usePullToRefresh(async () => {
  await Promise.all([fetchPlan(), fetchCategorias()])
})

const swipeZone = ref(null)
const attachedSwipeEl = ref(null)
const { attach: attachSwipe, detach: detachSwipe } = useSwipeMonth(mesAnterior, mesSiguiente)

onMounted(async () => {
  await Promise.all([fetchPlan(), fetchCategorias()])
  await nextTick()
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
