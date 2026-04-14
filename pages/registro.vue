<template>
  <div>
    <LayoutAppHeader>
      <template #title>Registro de Gastos</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto">
      <!-- Pull-to-refresh indicator -->
      <Transition name="ptr">
        <div v-if="isRefreshing" class="flex justify-center py-2">
          <svg class="animate-spin w-5 h-5 text-theme-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      <!-- Microphone + Camera section -->
      <div class="flex items-start justify-center gap-8 py-4 mb-4 px-4">
        <!-- Microphone -->
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

        <!-- Camera button -->
        <div class="pt-9">
          <RegistroBotonCamara
            :show-preview="showPhotoPreview"
            :photo-preview="photoPreview"
            @capture="onPhotoCapture"
            @send="onSendPhoto"
            @cancel="onCancelPhoto"
            @retake="onRetakePhoto"
          />
        </div>
      </div>

      <!-- Barra de búsqueda -->
      <div class="px-4 mb-3">
        <div class="relative group">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-sec transition-colors group-focus-within:text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="busquedaGasto"
            type="text"
            placeholder="Buscar gasto..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-theme-card border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:bg-theme-card transition-all duration-200"
          />
          <button v-if="busquedaGasto" class="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-sec hover:text-theme-text-sec transition-colors" @click="busquedaGasto = ''">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Rangos rápidos -->
      <div class="px-4 mb-2 flex gap-1.5">
        <button
          v-for="r in rangosRapidos"
          :key="r.value"
          class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="rangoRapido === r.value ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
          @click="rangoRapido = r.value"
        >
          {{ r.label }}
        </button>
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
          :class="vistaRegistro === 'historial' ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
          @click="vistaRegistro = 'historial'"
        >
          Historial
        </button>
        <button
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
          :class="vistaRegistro === 'categorias' ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
          @click="vistaRegistro = 'categorias'"
        >
          Categorías
        </button>
        <button
          class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
          :class="vistaRegistro === 'stats' ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
          @click="vistaRegistro = 'stats'"
        >
          Comparar
        </button>
        <button
          class="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-theme-card text-theme-text-sec border border-theme-border hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
          @click="exportarGastos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
      </div>

      <!-- Views (swipeable across all views) -->
      <div ref="historialSwipeZone">
        <Transition name="page" mode="out-in">
          <div :key="vistaRegistro">
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

            <RegistroStatsComparativas
              v-else-if="vistaRegistro === 'stats'"
              :mes-actual="mesSeleccionado"
              :anio-actual="anioSeleccionado"
              :gastos-actuales="gastosMensuales"
            />

            <RegistroGraficoCategoria
              v-else-if="vistaRegistro === 'categorias'"
              :datos="gastosPorCategoria"
              :gastos="gastosMensuales"
              :presupuesto="presupuesto"
              :categoria-seleccionada-id="categoriaFiltro"
              :categorias="categorias"
              :mes-actual="mesSeleccionado"
              :anio-actual="anioSeleccionado"
              @update:categoria-seleccionada="categoriaFiltro = $event"
            />
          </div>
        </Transition>
      </div>
      <div class="h-8"></div>
    </div>

    <!-- FAB: Agregar gasto manual -->
    <button
      class="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-theme-accent opacity-85 hover:opacity-100 active:scale-90 shadow-lg shadow-theme-accent/25 flex items-center justify-center transition-all duration-300 fab-pulse backdrop-blur-md"
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

    <!-- Photo confirmation modal -->
    <RegistroConfirmacionVoz
      v-if="showPhotoConfirmacion"
      :gastos="parsedPhotoExpenses"
      :transcripcion="'Escaneado desde foto de voucher'"
      :is-parsing="isParsingPhoto"
      :parse-error="photoParseError"
      :retry-status="photoRetryStatus"
      :categorias="categorias"
      :total-comprobante="photoTotalComprobante"
      :on-confirm="onConfirmPhotoGastos"
      @close="cerrarPhotoConfirmacion"
      @retry="reintentarParseImage"
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
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="gastoEliminar = null"></div>
      <div class="relative bg-gradient-to-b from-theme-card to-theme-card/95 rounded-2xl border border-red-500/10 p-6 mx-4 max-w-sm w-full shadow-xl shadow-black/20">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-theme-text">Eliminar gasto</h3>
            <p class="text-xs text-theme-text-sec">Tendrás 5 segundos para deshacer</p>
          </div>
        </div>
        <div class="bg-theme-input rounded-xl p-3 mb-5 border border-theme-border">
          <p class="text-sm text-theme-text-sec font-medium">{{ gastoEliminar.concepto }}</p>
          <p class="text-sm text-red-400 font-semibold mt-0.5">{{ currencySymbol }} {{ formatMonto(gastoEliminar.monto) }}</p>
        </div>
        <div class="flex gap-3">
          <button
            class="flex-1 py-2.5 rounded-xl text-sm text-theme-text-muted font-medium border border-theme-border hover:bg-theme-border-md active:scale-95 transition-all"
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
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-theme-card text-theme-text text-sm px-4 py-3 rounded-2xl shadow-xl shadow-black/30 backdrop-blur-sm border border-theme-border"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span class="text-theme-text-sec">Gasto eliminado</span>
        <button
          class="ml-1 px-3 py-1 rounded-lg bg-theme-accent-bg text-theme-accent font-semibold text-xs border border-theme-accent hover:bg-theme-accent-bg-hover active:scale-95 transition-all"
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

const {
  photoPreview, showPhotoPreview, showPhotoConfirmacion,
  isParsing: isParsingPhoto, parsedExpenses: parsedPhotoExpenses,
  parseError: photoParseError, retryStatus: photoRetryStatus,
  totalComprobante: photoTotalComprobante,
  onPhotoCapture, onSendPhoto, onRetakePhoto, onCancelPhoto,
  reintentarParseImage, cerrarPhotoConfirmacion,
} = usePhotoDraft()

const route = useRoute()
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
const rangoRapido = ref('mes') // 'hoy' | '7d' | 'mes'

const rangosRapidos = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: 'mes', label: 'Mes' },
]

function fechaDentroRango(fecha) {
  if (rangoRapido.value === 'mes') return true
  const hoy = new Date()
  const d = new Date(`${fecha}T00:00:00`)
  if (rangoRapido.value === 'hoy') {
    return d.toDateString() === hoy.toDateString()
  }
  if (rangoRapido.value === '7d') {
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - 6)
    desde.setHours(0, 0, 0, 0)
    return d >= desde && d <= hoy
  }
  return true
}

// Filtrar gastos por búsqueda, categoría y rango rápido
function filtrarGastos(gastosArr) {
  return gastosArr.filter(g => {
    const matchBusqueda = !busquedaGasto.value || g.concepto.toLowerCase().includes(busquedaGasto.value.toLowerCase())
    const matchCategoria = !categoriaFiltro.value || g.categoriaId === categoriaFiltro.value
    const matchRango = fechaDentroRango(g.fecha)
    return matchBusqueda && matchCategoria && matchRango
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

function mapGastosConIds(gastosEditados) {
  return gastosEditados.map(g => {
    const cat = getCategoriaPorNombre(g.categoria)
    return {
      concepto: g.concepto,
      monto: parseFloat(g.monto),
      categoriaId: cat?.id || categorias.value[0]?.id,
      fecha: g.fecha,
    }
  })
}

function pushOptimisticGastos(gastosConIds) {
  const now = new Date()
  const hora = now.toTimeString().slice(0, 5)
  const optimistas = gastosConIds.map((g, i) => {
    const cat = categorias.value.find(c => c.id === g.categoriaId)
    return {
      id: `tmp-${Date.now()}-${i}`,
      concepto: g.concepto,
      monto: g.monto,
      categoriaId: g.categoriaId,
      categoriaNombre: cat?.nombre || '',
      categoriaColor: cat?.color || null,
      categoriaIcono: cat?.icono || null,
      fecha: g.fecha,
      hora,
      pendiente: true,
    }
  })
  gastosMensuales.value = [...optimistas, ...gastosMensuales.value]
  return optimistas.map(o => o.id)
}

function rollbackOptimistic(tempIds) {
  gastosMensuales.value = gastosMensuales.value.filter(g => !tempIds.includes(g.id))
}

async function onConfirmGastos(gastosEditados) {
  vibrate([10, 50, 10])
  const gastosConIds = mapGastosConIds(gastosEditados)
  const tempIds = pushOptimisticGastos(gastosConIds)
  cerrarConfirmacion()
  showToast(`${gastosEditados.length} gasto${gastosEditados.length > 1 ? 's' : ''} registrado${gastosEditados.length > 1 ? 's' : ''}`)

  try {
    await createGastosBulk(gastosConIds, lastTranscript.value, 'voz')
    await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
  } catch (e) {
    rollbackOptimistic(tempIds)
    toastError(handleApiError(e) || 'No se pudo guardar el gasto')
  }
}

async function onConfirmPhotoGastos(gastosEditados) {
  vibrate([10, 50, 10])
  const gastosConIds = mapGastosConIds(gastosEditados)
  const tempIds = pushOptimisticGastos(gastosConIds)
  cerrarPhotoConfirmacion()
  showToast(`${gastosEditados.length} gasto${gastosEditados.length > 1 ? 's' : ''} registrado${gastosEditados.length > 1 ? 's' : ''}`)

  try {
    await createGastosBulk(gastosConIds, 'Escaneado desde foto de voucher', 'foto')
    await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
  } catch (e) {
    rollbackOptimistic(tempIds)
    toastError(handleApiError(e) || 'No se pudo guardar el gasto')
  }
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

function aplicarQueryMes() {
  const mes = Number(route.query.mes)
  const anio = Number(route.query.anio)

  if (mes >= 1 && mes <= 12) {
    mesSeleccionado.value = mes
  }
  if (anio >= 2000 && anio <= 3000) {
    anioSeleccionado.value = anio
  }
}

// Initial load
onMounted(async () => {
  aplicarQueryMes()
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
