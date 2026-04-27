<template>
  <div>
    <LayoutAppHeader>
      <template #title>Registro de Gastos</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto lg:max-w-none lg:mx-0">
      <Transition name="ptr">
        <div v-if="isRefreshing" class="flex justify-center py-2">
          <svg class="animate-spin w-5 h-5 text-theme-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      </Transition>

      <SharedMonthSelector
        :label="mesFormateado"
        :es-actual="esMesActual"
        :disable-next="esMesActual"
        container-class="px-4 py-3 lg:px-0 lg:pt-6"
        @prev="mesAnterior"
        @next="mesSiguiente"
        @go-to-current="irAMesActual"
      />

      <div class="lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] lg:gap-6 lg:mt-2">
        <!-- Sidebar izquierdo -->
        <div class="lg:sticky lg:top-20 lg:self-start lg:space-y-4">
          <div class="px-4 lg:px-0 mb-5 lg:mb-0">
            <RegistroResumenMesRegistro
              :total-mes="parseFloat(resumen.totalMes) || 0"
              :total-dia="totalDiaActual"
              :gastos-hoy-count="gastosHoyCount"
              :presupuesto="presupuesto"
              :presupuesto-default="presupuestoDefault"
              :categorias-resumen="gastosPorCategoria"
              :es-mes-actual="esMesActual"
              :dias-transcurridos="diasTranscurridos"
              :dias-del-mes="diasDelMes"
              @update:presupuesto="actualizarPresupuesto"
            />
          </div>

          <!-- BotonCamara unico (headless: solo gestiona preview/teleport modals) -->
          <RegistroBotonCamara
            ref="botonCamaraRef"
            :show-preview="showPhotoPreview"
            :photo-preview="photoPreview"
            :headless="true"
            @capture="onPhotoCapture"
            @send="onSendPhoto"
            @cancel="onCancelPhoto"
            @retake="onRetakePhoto"
          />

          <!-- Bloque sidebar desktop: trigger camara + mic grande -->
          <div class="hidden lg:block lg:rounded-2xl lg:border lg:border-theme-border lg:bg-theme-card lg:py-6">
            <div class="flex items-start justify-center gap-8">
              <div class="pt-9 flex flex-col items-center gap-3">
                <button
                  class="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 bg-gradient-to-br from-amber-500/50 to-orange-600/50 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 backdrop-blur-md"
                  aria-label="Escanear voucher"
                  @click="abrirCamara"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </button>
                <span class="text-xs text-theme-text-sec font-medium">Voucher</span>
              </div>
              <RegistroBotonMicrofono
                :is-listening="isListening"
                :transcript="transcript"
                :error="voiceError"
                :is-supported="isSupported"
                :has-draft="hasDraft"
                @start="onStartListening"
                @stop="onStopListening"
                @continue="onContinueListening"
              />
            </div>
            <div class="mt-3 px-2">
              <RegistroDraftVoz
                :transcript="transcript"
                :has-draft="hasDraft"
                :is-listening="isListening"
                @send="onSendDraft"
                @discard="onDiscardDraft"
                @overwrite="onOverwriteDraft"
                @update:transcript="onUpdateTranscript"
              />
            </div>
          </div>

          <!-- Draft de voz visible en mobile -->
          <div class="lg:hidden px-4 mb-3">
            <RegistroDraftVoz
              :transcript="transcript"
              :has-draft="hasDraft"
              :is-listening="isListening"
              @send="onSendDraft"
              @discard="onDiscardDraft"
              @overwrite="onOverwriteDraft"
              @update:transcript="onUpdateTranscript"
            />
          </div>

          <!-- Quick-add chips (E#1): favoritos frecuentes -->
          <div v-if="topFavoritos.length > 0" class="px-4 lg:px-0 mb-3 lg:mb-0">
            <RegistroQuickAddChips
              :favoritos="topFavoritos"
              :categorias="categorias"
              @add="onQuickAdd"
              @remove="eliminarFavorito"
            />
          </div>

          <div class="hidden lg:block lg:px-0">
            <button
              class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-theme-on-accent font-medium text-sm shadow-sm shadow-theme-accent/20 hover:opacity-90 active:scale-[0.98] transition-all"
              @click="showFormManual = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar gasto manual
            </button>
          </div>
        </div>

        <!-- Área principal derecha -->
        <div class="pb-20 lg:pb-0">
          <!-- Barra unificada de filtros (colapsable) -->
          <div class="px-4 lg:px-0 mb-3">
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors"
                :class="[
                  mostrarFiltros || tieneFiltrosActivos
                    ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
                    : 'bg-theme-card text-theme-text-sec border-theme-border'
                ]"
                @click="toggleFiltros"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtros
                <span v-if="conteoFiltrosActivos > 0" class="w-4 h-4 rounded-full bg-theme-accent text-theme-on-accent text-[9px] flex items-center justify-center font-bold leading-none">
                  {{ conteoFiltrosActivos }}
                </span>
              </button>

              <!-- Búsqueda colapsable -->
              <div class="flex-1 relative">
                <input
                  v-model="busquedaGasto"
                  type="text"
                  placeholder="Buscar gasto..."
                  class="w-full pl-9 pr-8 py-2 rounded-xl bg-theme-card border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent transition-all"
                />
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-sec" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <button v-if="busquedaGasto" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-sec" @click="busquedaGasto = ''">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <button
                class="flex items-center justify-center w-9 h-9 rounded-xl bg-theme-card text-theme-text-sec border border-theme-border hover:text-emerald-400 hover:border-emerald-500/30 transition-colors shrink-0"
                aria-label="Exportar a Excel"
                @click="exportarGastos"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>

            <Transition name="expand">
              <div v-if="mostrarFiltros" class="mt-2 space-y-2 overflow-hidden">
                <div class="flex gap-1.5">
                  <button
                    v-for="r in rangosRapidos"
                    :key="r.value"
                    class="flex-1 lg:flex-none lg:px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    :class="rangoRapido === r.value ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
                    @click="onRangoChange(r.value)"
                  >
                    {{ r.label }}
                  </button>
                  <button
                    v-if="tieneFiltrosActivos"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    @click="limpiarFiltros"
                  >
                    Limpiar
                  </button>
                </div>
                <RegistroFiltrosCategoriaBar v-model="categoriaFiltro" :categorias="categorias" />
              </div>
            </Transition>
          </div>

          <!-- Tabs + export (sticky) -->
          <div class="sticky top-14 z-20 bg-theme-bg/95 backdrop-blur-sm lg:static lg:bg-transparent">
            <div class="flex items-center gap-2 px-4 lg:px-0 py-2 lg:pt-0 mb-2 lg:mb-4">
              <button
                v-for="tab in tabsVista"
                :key="tab.value"
                class="flex-1 lg:flex-none lg:px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                :class="vistaRegistro === tab.value ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
                @click="onCambiarVista(tab.value)"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <!-- Views -->
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
                  :mostrar-vista-dia="configVistaDia"
                  :mostrar-vista-semana="configVistaSemana"
                  @edit="abrirEdicion"
                  @delete="confirmarEliminar"
                  @duplicate="duplicarGasto"
                  @bulk-edit="onBulkEditSolicitado"
                  @bulk-delete="onBulkDeleteSolicitado"
                  @request-voice="onStartListening"
                  @request-manual="showFormManual = true"
                  @seleccion-activa="seleccionMultipleActiva = $event"
                />

                <Suspense v-else-if="vistaRegistro === 'stats'">
                  <RegistroStatsComparativasAsync
                    :mes-actual="mesSeleccionado"
                    :anio-actual="anioSeleccionado"
                    :gastos-actuales="gastosMensuales"
                  />
                  <template #fallback>
                    <div class="px-4 space-y-2">
                      <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-theme-card shimmer"></div>
                    </div>
                  </template>
                </Suspense>

                <Suspense v-else-if="vistaRegistro === 'categorias'">
                  <RegistroGraficoCategoriaAsync
                    :datos="gastosPorCategoria"
                    :gastos="gastosMensuales"
                    :presupuesto="presupuesto"
                    :categoria-seleccionada-id="categoriaFiltro"
                    :categorias="categorias"
                    :mes-actual="mesSeleccionado"
                    :anio-actual="anioSeleccionado"
                    @update:categoria-seleccionada="categoriaFiltro = $event"
                  />
                  <template #fallback>
                    <div class="px-4 space-y-2">
                      <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-theme-card shimmer"></div>
                    </div>
                  </template>
                </Suspense>
              </div>
            </Transition>
          </div>
          <div class="h-2"></div>
        </div>
      </div>
    </div>

    <!-- FABs mobile: foto, microfono (resaltado), manual -->
    <RegistroFabsCaptura
      v-if="!seleccionMultipleActiva"
      :is-listening="isListening"
      :has-draft="hasDraft"
      :is-supported="isSupported"
      @voice-toggle="onVoiceFabToggle"
      @photo="abrirCamara"
      @manual="showFormManual = true"
    />

    <!-- Voice confirmation modal (lazy) -->
    <RegistroConfirmacionVozAsync
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

    <!-- Photo confirmation (lazy) -->
    <RegistroConfirmacionVozAsync
      v-if="showPhotoConfirmacion"
      :gastos="parsedPhotoExpenses"
      :transcripcion="'Escaneado desde foto de voucher'"
      :is-parsing="isParsingPhoto"
      :parse-error="photoParseError"
      :retry-status="photoRetryStatus"
      :categorias="categorias"
      :total-comprobante="photoTotalComprobante"
      :show-fecha-global="true"
      :on-confirm="onConfirmPhotoGastos"
      @close="cerrarPhotoConfirmacion"
      @retry="reintentarParseImage"
    />

    <!-- Manual form modal (lazy) -->
    <RegistroFormGastoManualAsync
      v-if="showFormManual"
      :categorias="categorias"
      :gasto-editar="gastoEditar"
      :gasto-duplicar="gastoDuplicar"
      @close="cerrarFormManual"
      @saved="onGastoManualSaved"
    />

    <!-- Bulk edit form modal (lazy) -->
    <RegistroFormBulkEditAsync
      v-if="showBulkEdit"
      :categorias="categorias"
      :ids="bulkEditPayload?.ids || []"
      @close="cerrarBulkEdit"
      @saved="ejecutarBulkEdit"
    />

    <!-- Delete confirm dialog (shared) -->
    <SharedConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar gasto"
      :message="mensajeEliminar"
      confirm-label="Eliminar"
      variant="danger"
      @confirm="ejecutarEliminar"
    />

    <!-- Bulk delete confirm dialog -->
    <SharedConfirmDialog
      v-model="showBulkDeleteConfirm"
      title="Eliminar varios gastos"
      :message="mensajeBulkEliminar"
      :confirm-label="`Eliminar ${bulkDeletePayload?.count || 0} gastos`"
      variant="danger"
      require-checkbox
      checkbox-label="Confirmo que quiero eliminar estos gastos. Esta acción NO se puede deshacer."
      :loading="bulkDeleteLoading"
      @confirm="ejecutarBulkEliminar"
    />

    <!-- Toast success -->
    <Transition name="toast">
      <div v-if="toastMsg"
        class="fixed left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 backdrop-blur-sm border border-emerald-400/20"
        :class="undoPendiente ? 'bottom-40' : 'bottom-24'"
      >
        {{ toastMsg }}
      </div>
    </Transition>

    <!-- Undo toast -->
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
// Lazy-loaded heavy components
const RegistroStatsComparativasAsync = defineAsyncComponent(() =>
  import('~/components/registro/StatsComparativas.vue')
)
const RegistroGraficoCategoriaAsync = defineAsyncComponent(() =>
  import('~/components/registro/GraficoCategoria.vue')
)
const RegistroConfirmacionVozAsync = defineAsyncComponent(() =>
  import('~/components/registro/ConfirmacionVoz.vue')
)
const RegistroFormGastoManualAsync = defineAsyncComponent(() =>
  import('~/components/registro/FormGastoManual.vue')
)
const RegistroFormBulkEditAsync = defineAsyncComponent(() =>
  import('~/components/registro/FormBulkEdit.vue')
)

const {
  gastosMensuales, categorias, resumen, isLoadingMensual,
  mesSeleccionado, anioSeleccionado, mesFormateado, esMesActual,
  gastosPorDia, gastosPorSemana, gastosPorCategoria,
  fetchResumen, fetchCategorias, fetchGastosMensuales,
  createGastosBulk, updateGastosBulk, deleteGasto, deleteGastosBulk,
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
const { success: toastSuccess, error: toastError } = useToast()
const { vibrate } = useHaptic()

// Presupuesto (composable)
const { presupuesto, fetchPresupuesto, actualizarPresupuesto } = usePresupuestoMes({
  mesSeleccionado, anioSeleccionado,
})
const presupuestoDefault = computed(() => parseFloat(config.value?.presupuestoMensualDefault) || 0)
const configVistaDia = computed(() => config.value?.vistaRegistroDia !== false)
const configVistaSemana = computed(() => config.value?.vistaRegistroSemana === true)

// Filtros (composable)
const {
  busquedaGasto, categoriaFiltro, rangoRapido, rangosRapidos,
  gastosPorDiaFiltrados, gastosPorSemanaFiltrados,
  tieneFiltrosActivos, conteoFiltrosActivos, limpiarFiltros,
} = useRegistroFilters({ gastosPorDia, gastosPorSemana, esMesActual })

// Optimistic (composable)
const { mapGastosConIds, pushOptimisticGastos, rollbackOptimistic } = useOptimisticGastos({
  gastosMensuales, categorias, getCategoriaPorNombre,
})

// Export (composable)
const { exportarGastos } = useRegistroExport({ mesFormateado, gastosMensuales })

// Delete (composable)
const {
  gastoEliminar, undoPendiente, undoCountdown,
  confirmarEliminar: confirmarEliminarInterno, cancelarConfirmacion,
  ejecutarEliminar, deshacerEliminar,
} = useGastoDelete({
  gastosMensuales, deleteGasto,
  fetchResumenMensual: () => fetchResumenMensual(),
  toastError,
})

// Favoritos (E#1)
const { topFavoritos, cargar: cargarFavoritos, registrarUsoBulk, eliminarFavorito } = useGastoFavoritos()

// Estado de UI
const vistaRegistro = ref('historial')
const mostrarFiltros = ref(false)
const showFormManual = ref(false)
const gastoEditar = ref(null)
const gastoDuplicar = ref(null)
const toastMsg = ref('')
const seleccionMultipleActiva = ref(false)
const botonCamaraRef = ref(null)

// ─── Datos para ResumenMesRegistro ─────────────────────
const totalDiaActual = computed(() => parseFloat(resumen.value?.totalDia) || 0)

const gastosHoyCount = computed(() => {
  const hoy = useFechaPeru().fechaHoy()
  return gastosMensuales.value.filter(g => g.fecha === hoy).length
})

const diasTranscurridos = computed(() => {
  if (!esMesActual.value) return 0
  return new Date().getDate()
})

const diasDelMes = computed(() =>
  new Date(anioSeleccionado.value, mesSeleccionado.value, 0).getDate()
)

// ─── Triggers para FabsCaptura ─────────────────────────
function abrirCamara() {
  botonCamaraRef.value?.openCamera()
}

function onVoiceFabToggle() {
  if (isListening.value) onStopListening()
  else onStartListening()
}

const tabsVista = [
  { value: 'historial', label: 'Historial' },
  { value: 'categorias', label: 'Categorías' },
  { value: 'stats', label: 'Comparar' },
]

function toggleFiltros() {
  vibrate(10)
  mostrarFiltros.value = !mostrarFiltros.value
}

function onRangoChange(value) {
  vibrate(10)
  rangoRapido.value = value
}

function onCambiarVista(value) {
  vibrate(10)
  vistaRegistro.value = value
}

const showDeleteConfirm = computed({
  get: () => !!gastoEliminar.value,
  set: (v) => { if (!v) cancelarConfirmacion() },
})
const mensajeEliminar = computed(() => {
  if (!gastoEliminar.value) return ''
  return `¿Eliminar "${gastoEliminar.value.concepto}"? Tendrás 5 segundos para deshacer.`
})

function confirmarEliminar(gasto) {
  confirmarEliminarInterno(gasto)
}

// ─── Bulk delete ────────────────────────────────────────
const showBulkDeleteConfirm = ref(false)
const bulkDeleteLoading = ref(false)
const bulkDeletePayload = ref(null)

const mensajeBulkEliminar = computed(() => {
  if (!bulkDeletePayload.value) return ''
  const n = bulkDeletePayload.value.count
  return `Vas a eliminar ${n} ${n === 1 ? 'gasto' : 'gastos'} de forma permanente. Esta acción no tiene undo.`
})

function onBulkDeleteSolicitado(payload) {
  bulkDeletePayload.value = payload
  showBulkDeleteConfirm.value = true
}

async function ejecutarBulkEliminar() {
  if (!bulkDeletePayload.value) return
  const { ids, onDone } = bulkDeletePayload.value
  bulkDeleteLoading.value = true
  try {
    const res = await deleteGastosBulk(ids)
    showBulkDeleteConfirm.value = false
    showToast(`${res.eliminados || ids.length} gastos eliminados`)
    onDone?.()
    await fetchResumenMensual()
  } catch (e) {
    toastError(handleApiError(e) || 'No se pudieron eliminar los gastos')
  } finally {
    bulkDeleteLoading.value = false
    bulkDeletePayload.value = null
  }
}

// ─── Bulk edit ──────────────────────────────────────────
const showBulkEdit = ref(false)
const bulkEditPayload = ref(null)

function onBulkEditSolicitado(payload) {
  bulkEditPayload.value = payload
  showBulkEdit.value = true
}

function cerrarBulkEdit() {
  showBulkEdit.value = false
  bulkEditPayload.value = null
}

async function ejecutarBulkEdit({ ids, campos }) {
  try {
    const res = await updateGastosBulk(ids, campos)
    showBulkEdit.value = false
    showToast(`${res.actualizados || ids.length} gastos actualizados`)
    bulkEditPayload.value?.onDone?.()
    await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
  } catch (e) {
    toastError(handleApiError(e) || 'No se pudieron actualizar los gastos')
  } finally {
    bulkEditPayload.value = null
  }
}

// Quick-add: registrar rápidamente un favorito
async function onQuickAdd(chip) {
  vibrate([10, 30, 10])
  const hoy = useFechaPeru().fechaHoy()
  const gastoConId = {
    concepto: chip.concepto,
    monto: Number(chip.monto),
    categoriaId: chip.categoriaId,
    fecha: hoy,
  }
  const tempIds = pushOptimisticGastos([gastoConId])
  showToast(`${chip.concepto} · ${chip.monto}`)
  try {
    await createGastosBulk([gastoConId], null, 'manual')
    registrarUsoBulk([gastoConId])
    await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
  } catch (e) {
    rollbackOptimistic(tempIds)
    toastError(handleApiError(e) || 'No se pudo guardar el gasto')
  }
}

// Duplicar gasto (E#2) — abre formulario con datos pre-cargados
function duplicarGasto(gasto) {
  vibrate([10, 30, 10])
  gastoDuplicar.value = gasto
  showFormManual.value = true
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

async function onConfirmGastos(gastosEditados) {
  vibrate([10, 50, 10])
  const gastosConIds = mapGastosConIds(gastosEditados)
  const tempIds = pushOptimisticGastos(gastosConIds)
  cerrarConfirmacion()
  showToast(`${gastosEditados.length} gasto${gastosEditados.length > 1 ? 's' : ''} registrado${gastosEditados.length > 1 ? 's' : ''}`)
  try {
    await createGastosBulk(gastosConIds, lastTranscript.value, 'voz')
    registrarUsoBulk(gastosConIds)
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
    registrarUsoBulk(gastosConIds)
    await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
  } catch (e) {
    rollbackOptimistic(tempIds)
    toastError(handleApiError(e) || 'No se pudo guardar el gasto')
  }
}

function abrirEdicion(gasto) {
  gastoEditar.value = gasto
  showFormManual.value = true
}

function cerrarFormManual() {
  showFormManual.value = false
  gastoEditar.value = null
  gastoDuplicar.value = null
}

async function onGastoManualSaved(gasto) {
  cerrarFormManual()
  showToast('Gasto guardado')
  if (gasto?.concepto && gasto?.monto && gasto?.categoriaId) {
    registrarUsoBulk([gasto])
  }
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
}

watch([mesSeleccionado, anioSeleccionado], async () => {
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual(), fetchPresupuesto()])
})

async function fetchResumenMensual() {
  const hoy = useFechaPeru().fechaHoy()
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
  if (mes >= 1 && mes <= 12) mesSeleccionado.value = mes
  if (anio >= 2000 && anio <= 3000) anioSeleccionado.value = anio
}

onMounted(async () => {
  aplicarQueryMes()
  cargarFavoritos()
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual(), fetchCategorias(), fetchPresupuesto(), fetchConfig()])
  attachSwipe(historialSwipeZone.value)
})

onUnmounted(() => detachSwipe(historialSwipeZone.value))
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translate(-50%, 20px); }
.toast-leave-to { opacity: 0; transform: translate(-50%, -10px); }

.expand-enter-active, .expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
