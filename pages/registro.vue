<template>
  <div>
    <LayoutAppHeader>
      <template #title>Registro de Gastos</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto">
      <!-- Pull-to-refresh indicator -->
      <Transition name="ptr">
        <div v-if="isRefreshing" class="flex justify-center py-2">
          <svg class="animate-spin w-5 h-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      </Transition>

      <!-- Month navigator -->
      <SharedMonthSelector
        :label="mesFormateado"
        :es-actual="esMesActual"
        :disable-next="esMesActual"
        container-class="px-4 py-3"
        @prev="mesAnterior"
        @next="mesSiguiente"
        @go-to-current="irAMesActual"
      />

      <!-- Summary card -->
      <div class="px-4 mb-5">
        <RegistroResumenMesRegistro
          :total-mes="parseFloat(resumen.totalMes) || 0"
          :presupuesto="presupuesto"
          :presupuesto-default="presupuestoDefault"
          @update:presupuesto="actualizarPresupuesto"
        />
      </div>

      <!-- Microphone section -->
      <div class="py-4 mb-4">
        <RegistroBotonMicrofono
          :is-listening="isListening"
          :transcript="transcript"
          :error="voiceError"
          :is-supported="isSupported"
          :has-draft="hasDraft"
          @start="onStartListening"
          @stop="onStopListening"
          @continue="onContinueListening"
          @send="onSendDraft"
          @discard="onDiscardDraft"
          @overwrite="onOverwriteDraft"
          @update:transcript="onUpdateTranscript"
        />
      </div>

      <!-- Barra de búsqueda -->
      <div class="px-4 mb-3">
        <div class="relative group">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="busquedaGasto"
            type="text"
            placeholder="Buscar gasto..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-primary-800/50 border border-primary-700/20 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/40 focus:bg-primary-800/70 transition-all duration-200"
          />
          <button v-if="busquedaGasto" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" @click="busquedaGasto = ''">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Filtros de categoría -->
      <div class="px-4 mb-3">
        <RegistroFiltrosCategoriaBar
          v-model="categoriaFiltro"
          :categorias="categorias"
        />
      </div>

      <!-- Tab toggle: Historial / Categorías / Stats + Export -->
      <div class="flex items-center gap-2 px-4 mb-4">
        <button
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
          :class="vistaRegistro === 'historial' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
          @click="vistaRegistro = 'historial'"
        >
          Historial
        </button>
        <button
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
          :class="vistaRegistro === 'categorias' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
          @click="vistaRegistro = 'categorias'"
        >
          Categorías
        </button>
        <button
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
          :class="vistaRegistro === 'stats' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
          @click="vistaRegistro = 'stats'"
        >
          Comparar
        </button>
        <button
          class="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-primary-800/40 text-gray-500 border border-primary-700/20 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
          @click="exportarGastos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
      </div>

      <!-- Monthly history (swipeable) -->
      <div ref="historialSwipeZone">
        <RegistroHistorialDiario
          v-if="vistaRegistro === 'historial'"
          :gastos-por-dia="gastosPorDiaFiltrados"
          :gastos-por-semana="gastosPorSemanaFiltrados"
          :is-loading="isLoadingMensual"
          :format-fecha-dia="formatFechaDia"
          :format-rango-semana="formatRangoSemana"
          @edit="abrirEdicion"
          @delete="confirmarEliminar"
        />
      </div>

      <!-- Comparative stats -->
      <RegistroStatsComparativas
        v-if="vistaRegistro === 'stats'"
        :mes-actual="mesSeleccionado"
        :anio-actual="anioSeleccionado"
        :gastos-actuales="gastosMensuales"
      />

      <!-- Category chart -->
      <RegistroGraficoCategoria
        v-if="vistaRegistro === 'categorias'"
        :datos="gastosPorCategoria"
        :gastos="gastosMensuales"
        :presupuesto="presupuesto"
        :categoria-seleccionada-id="categoriaFiltro"
        :categorias="categorias"
        :mes-actual="mesSeleccionado"
        :anio-actual="anioSeleccionado"
        @update:categoria-seleccionada="categoriaFiltro = $event"
      />

      <div class="h-8"></div>
    </div>

    <!-- FAB: Agregar gasto manual -->
    <button
      class="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/75 to-indigo-600/75 hover:from-blue-400/85 hover:to-indigo-500/85 active:scale-90 shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all duration-300 fab-pulse backdrop-blur-md"
      @click="showFormManual = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <!-- Voice confirmation modal -->
    <RegistroConfirmacionVoz
      v-if="showConfirmacion"
      :gastos="parsedExpenses"
      :transcripcion="lastTranscript"
      :is-parsing="isParsing"
      :parse-error="parseError"
      :retry-status="retryStatus"
      :categorias="categorias"
      :on-confirm="onConfirmGastos"
      @close="cerrarConfirmacion"
      @retry="reintentarParse"
    />

    <!-- Manual form modal -->
    <RegistroFormGastoManual
      v-if="showFormManual"
      :categorias="categorias"
      :gasto-editar="gastoEditar"
      @close="cerrarFormManual"
      @saved="onGastoManualSaved"
    />

    <!-- Delete confirmation -->
    <div v-if="gastoEliminar" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="gastoEliminar = null"></div>
      <div class="relative bg-gradient-to-b from-primary-800 to-primary-800/95 rounded-2xl border border-red-500/10 p-6 mx-4 max-w-sm w-full shadow-xl shadow-black/20">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-white">Eliminar gasto</h3>
            <p class="text-xs text-gray-500">Tendrás 5 segundos para deshacer</p>
          </div>
        </div>
        <div class="bg-primary-900/40 rounded-xl p-3 mb-5 border border-primary-700/20">
          <p class="text-sm text-gray-300 font-medium">{{ gastoEliminar.concepto }}</p>
          <p class="text-sm text-red-400 font-semibold mt-0.5">{{ currencySymbol }} {{ formatMonto(gastoEliminar.monto) }}</p>
        </div>
        <div class="flex gap-3">
          <button
            class="flex-1 py-2.5 rounded-xl text-sm text-gray-400 font-medium border border-primary-700/30 hover:bg-primary-700/30 active:scale-95 transition-all"
            @click="gastoEliminar = null"
          >
            Cancelar
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl text-sm text-white font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 active:scale-95 shadow-sm shadow-red-500/20 transition-all"
            @click="ejecutarEliminar"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <Transition name="toast">
      <div v-if="toastMsg"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 backdrop-blur-sm border border-emerald-400/20"
      >
        {{ toastMsg }}
      </div>
    </Transition>

    <!-- Undo delete toast -->
    <Transition name="toast">
      <div v-if="undoPendiente"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-primary-800/95 text-white text-sm px-4 py-3 rounded-2xl shadow-xl shadow-black/30 backdrop-blur-sm border border-primary-700/40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span class="text-gray-300">Gasto eliminado</span>
        <button
          class="ml-1 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 font-semibold text-xs border border-blue-500/30 hover:bg-blue-500/30 active:scale-95 transition-all"
          @click="deshacerEliminar"
        >
          Deshacer ({{ undoCountdown }}s)
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const {
  gastos: _gastos, gastosMensuales, categorias, resumen, isLoading, isLoadingMensual,
  mesSeleccionado, anioSeleccionado, mesFormateado, esMesActual,
  gastosPorDia, gastosPorSemana, gastosPorCategoria,
  fetchGastos, fetchResumen, fetchCategorias, fetchGastosMensuales,
  createGastosBulk, deleteGasto,
  mesAnterior, mesSiguiente, irAMesActual,
  getCategoriaPorNombre,
  formatFechaDia, formatRangoSemana,
} = useGastos()

const {
  isListening, transcript, voiceError, isSupported, hasDraft,
  showConfirmacion, lastTranscript, isParsing, parsedExpenses, parseError, retryStatus,
  onStartListening, onStopListening, onContinueListening,
  onSendDraft, onDiscardDraft, onOverwriteDraft, onUpdateTranscript,
  reintentarParse, cerrarConfirmacion,
} = useVoiceDraft()

const { config, fetchConfig } = useConfiguraciones()
const { apiFetch } = useApiFetch()
const { success: toastSuccess, error: toastError } = useToast()

const presupuesto = ref(0)
const planId = ref(null)
const presupuestoDefault = computed(() => parseFloat(config.value?.presupuestoMensualDefault) || 0)

async function fetchPresupuesto() {
  try {
    const data = await $fetch('/api/planificador', {
      query: { mes: mesSeleccionado.value, anio: anioSeleccionado.value }
    })
    presupuesto.value = parseFloat(data.plan?.montoPresupuesto) || 0
    planId.value = data.plan?.id || null
  } catch {
    presupuesto.value = 0
    planId.value = null
  }
}

async function actualizarPresupuesto(monto) {
  if (!planId.value) return
  try {
    await apiFetch('/api/planificador', {
      method: 'PUT',
      body: { id: planId.value, montoPresupuesto: monto }
    })
    presupuesto.value = monto
    toastSuccess('Presupuesto actualizado')
  } catch (e) {
    toastError(handleApiError(e))
  }
}

const vistaRegistro = ref('historial')
const busquedaGasto = ref('')
const categoriaFiltro = ref(null)

// Filtrar gastos por búsqueda y categoría
function filtrarGastos(gastosArr) {
  return gastosArr.filter(g => {
    const matchBusqueda = !busquedaGasto.value || g.concepto.toLowerCase().includes(busquedaGasto.value.toLowerCase())
    const matchCategoria = !categoriaFiltro.value || g.categoriaId === categoriaFiltro.value
    return matchBusqueda && matchCategoria
  })
}

const gastosPorDiaFiltrados = computed(() => {
  return gastosPorDia.value
    .map(dia => {
      const gastosFiltrados = filtrarGastos(dia.gastos)
      return {
        ...dia,
        gastos: gastosFiltrados,
        total: gastosFiltrados.reduce((sum, g) => sum + g.monto, 0),
      }
    })
    .filter(dia => dia.gastos.length > 0)
})

const gastosPorSemanaFiltrados = computed(() => {
  return gastosPorSemana.value
    .map(semana => {
      const diasFiltrados = semana.dias
        .map(dia => {
          const gastosFiltrados = filtrarGastos(dia.gastos)
          return {
            ...dia,
            gastos: gastosFiltrados,
            total: gastosFiltrados.reduce((sum, g) => sum + g.monto, 0),
          }
        })
        .filter(dia => dia.gastos.length > 0)
      return {
        ...semana,
        dias: diasFiltrados,
        total: diasFiltrados.reduce((sum, d) => sum + d.total, 0),
      }
    })
    .filter(semana => semana.dias.length > 0)
})

const showFormManual = ref(false)
const gastoEditar = ref(null)
const gastoEliminar = ref(null)
const toastMsg = ref('')
const undoPendiente = ref(null)
const undoCountdown = ref(5)
let undoTimer = null
let undoCountdownTimer = null

const { currencySymbol, formatMonto } = useCurrency()
const { exportarExcel } = useExportExcel()
const { vibrate } = useHaptic()

function exportarGastos() {
  const columnas = [
    { label: 'Fecha', getValue: g => g.fecha },
    { label: 'Hora', getValue: g => g.hora || '' },
    { label: 'Concepto', getValue: g => g.concepto },
    { label: 'Categoría', getValue: g => g.categoriaNombre || '' },
    { label: 'Monto', getValue: g => g.monto },
    { label: 'Método', getValue: g => g.metodoRegistro || '' },
    { label: 'Notas', getValue: g => g.notas || '' },
  ]
  exportarExcel(`gastos_${mesFormateado.value.replace(' ', '_')}`, columnas, gastosMensuales.value)
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

async function onConfirmGastos(gastosEditados) {
  vibrate([10, 50, 10])
  // Map category names to IDs
  const gastosConIds = gastosEditados.map(g => {
    const cat = getCategoriaPorNombre(g.categoria)
    return {
      concepto: g.concepto,
      monto: parseFloat(g.monto),
      categoriaId: cat?.id || categorias.value[0]?.id,
      fecha: g.fecha,
    }
  })

  await createGastosBulk(gastosConIds, lastTranscript.value)
  cerrarConfirmacion()
  showToast(`${gastosEditados.length} gasto${gastosEditados.length > 1 ? 's' : ''} registrado${gastosEditados.length > 1 ? 's' : ''}`)
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
}

// Manual form
function abrirEdicion(gasto) {
  gastoEditar.value = gasto
  showFormManual.value = true
}

function cerrarFormManual() {
  showFormManual.value = false
  gastoEditar.value = null
}

async function onGastoManualSaved() {
  cerrarFormManual()
  showToast('Gasto guardado')
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
}

// Delete
function confirmarEliminar(gasto) {
  gastoEliminar.value = gasto
}

function ejecutarEliminar() {
  if (!gastoEliminar.value) return
  const gasto = gastoEliminar.value
  gastoEliminar.value = null

  // Optimistic removal from monthly list
  gastosMensuales.value = gastosMensuales.value.filter(g => g.id !== gasto.id)

  // Start undo window
  undoPendiente.value = gasto
  undoCountdown.value = 5
  clearTimeout(undoTimer)
  clearInterval(undoCountdownTimer)

  undoCountdownTimer = setInterval(() => {
    undoCountdown.value--
    if (undoCountdown.value <= 0) clearInterval(undoCountdownTimer)
  }, 1000)

  undoTimer = setTimeout(async () => {
    clearInterval(undoCountdownTimer)
    undoPendiente.value = null
    try {
      await deleteGasto(gasto.id)
      await fetchResumenMensual()
    } catch {
      // Restore on error
      await fetchGastosMensuales()
    }
  }, 5000)
}

function deshacerEliminar() {
  clearTimeout(undoTimer)
  clearInterval(undoCountdownTimer)
  if (undoPendiente.value) {
    // Restore to monthly list in sorted position
    gastosMensuales.value = [...gastosMensuales.value, undoPendiente.value]
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
        return (b.hora || '').localeCompare(a.hora || '')
      })
  }
  undoPendiente.value = null
}

// Re-fetch when month changes
watch([mesSeleccionado, anioSeleccionado], async () => {
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual(), fetchPresupuesto()])
})

async function fetchResumenMensual() {
  const hoy = new Date().toISOString().split('T')[0]
  await fetchResumen(hoy, mesSeleccionado.value, anioSeleccionado.value)
}

const { isRefreshing } = usePullToRefresh(async () => {
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual(), fetchCategorias(), fetchPresupuesto()])
})

const historialSwipeZone = ref(null)
const { attach: attachSwipe, detach: detachSwipe } = useSwipeMonth(mesAnterior, mesSiguiente)

// Initial load
onMounted(async () => {
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual(), fetchCategorias(), fetchPresupuesto(), fetchConfig()])
  attachSwipe(historialSwipeZone.value)
})

onUnmounted(() => detachSwipe(historialSwipeZone.value))
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
