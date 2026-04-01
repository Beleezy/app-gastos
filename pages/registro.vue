<template>
  <div>
    <LayoutAppHeader>
      <template #title>Registro de Gastos</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto">
      <!-- Month navigator -->
      <div class="flex items-center justify-between px-4 py-3">
        <button
          class="w-9 h-9 rounded-xl bg-primary-800/60 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary-700/60 active:scale-95 transition-all border border-primary-700/20"
          @click="mesAnterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="text-center">
          <button
            class="text-base font-bold text-white hover:text-blue-400 transition-colors"
            @click="irAMesActual"
          >
            {{ mesFormateado }}
          </button>
          <p class="text-[10px] text-blue-400/60 font-medium mt-0.5" v-if="!esMesActual">
            Toca para ir al mes actual
          </p>
        </div>

        <button
          class="w-9 h-9 rounded-xl bg-primary-800/60 flex items-center justify-center transition-all border border-primary-700/20"
          :class="esMesActual ? 'text-gray-700 cursor-not-allowed opacity-40' : 'text-gray-400 hover:text-white hover:bg-primary-700/60 active:scale-95'"
          :disabled="esMesActual"
          @click="mesSiguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Summary card -->
      <div class="px-4 mb-5">
        <div class="relative bg-gradient-to-br from-primary-800/80 to-primary-800/60 rounded-2xl border border-primary-700/20 px-4 py-4 overflow-hidden">
          <!-- Decorative glow -->
          <div class="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/6 rounded-full blur-2xl"></div>

          <!-- Budget + spent -->
          <div class="relative flex items-end justify-between mb-3">
            <div>
              <p class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">Gastado este mes</p>
              <p class="text-2xl font-bold text-gradient-blue">{{ currencySymbol }} {{ formatMonto(resumen.totalMes) }}</p>
            </div>
            <div v-if="presupuesto > 0" class="text-right">
              <p class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">Presupuesto</p>
              <p class="text-base font-semibold text-gray-300">{{ currencySymbol }} {{ formatMonto(presupuesto) }}</p>
            </div>
          </div>
          <!-- Progress bar + remaining -->
          <div v-if="presupuesto > 0" class="relative">
            <div class="w-full h-1.5 bg-primary-900/50 rounded-full overflow-hidden mb-2">
              <div
                class="h-full rounded-full transition-all duration-700 ease-out"
                :class="porcentajeGastado > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : porcentajeGastado > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
                :style="{ width: Math.min(porcentajeGastado, 100) + '%' }"
              ></div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full"
                :class="saldoRestante >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'"
              >
                {{ saldoRestante >= 0 ? 'Disponible' : 'Excedido' }}: {{ currencySymbol }} {{ formatMonto(Math.abs(saldoRestante)) }}
              </span>
              <span class="text-[10px] text-gray-500 font-medium">{{ porcentajeGastado.toFixed(0) }}%</span>
            </div>
          </div>
        </div>
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
      <div class="px-4 mb-3 overflow-x-auto scrollbar-hide">
        <div class="flex items-center gap-1.5 min-w-max">
          <button
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            :class="!categoriaFiltro ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
            @click="categoriaFiltro = null"
          >
            Todas
          </button>
          <button
            v-for="cat in categorias"
            :key="cat.id"
            class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            :class="categoriaFiltro === cat.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
            @click="categoriaFiltro = categoriaFiltro === cat.id ? null : cat.id"
          >
            <span>{{ cat.icono || '📦' }}</span>
            <span>{{ cat.nombre }}</span>
          </button>
        </div>
      </div>

      <!-- Tab toggle: Historial / Categorías + Export -->
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
          class="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-primary-800/40 text-gray-500 border border-primary-700/20 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
          @click="exportarGastos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV
        </button>
      </div>

      <!-- Monthly history -->
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

      <!-- Category chart -->
      <RegistroGraficoCategoria
        v-if="vistaRegistro === 'categorias'"
        :datos="gastosPorCategoria"
        :gastos="gastosMensuales"
        :presupuesto="presupuesto"
        :categoria-seleccionada-id="categoriaFiltro"
        :categorias="categorias"
        @update:categoria-seleccionada="categoriaFiltro = $event"
      />

      <div class="h-8"></div>
    </div>

    <!-- FAB: Agregar gasto manual -->
    <button
      class="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 active:scale-90 shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all duration-300 fab-pulse"
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
      :categorias="categorias"
      @close="cerrarConfirmacion"
      @confirm="onConfirmGastos"
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
            <p class="text-xs text-gray-500">Esta accion no se puede deshacer</p>
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

const { isListening, transcript, error: voiceError, isSupported, startListening, continueListening, stopListening, resetTranscript } = useVoiceRecognition()
const { isParsing, parsedExpenses, error: parseError, parseVoiceText, clearParsed } = useLLMParser()

const presupuesto = ref(0)

const porcentajeGastado = computed(() => {
  if (presupuesto.value <= 0) return 0
  return ((parseFloat(resumen.value.totalMes) || 0) / presupuesto.value) * 100
})

const saldoRestante = computed(() => {
  return presupuesto.value - (parseFloat(resumen.value.totalMes) || 0)
})

async function fetchPresupuesto() {
  try {
    const data = await $fetch('/api/planificador', {
      query: { mes: mesSeleccionado.value, anio: anioSeleccionado.value }
    })
    presupuesto.value = data.plan?.montoPresupuesto || 0
  } catch {
    presupuesto.value = 0
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

const showConfirmacion = ref(false)
const showFormManual = ref(false)
const gastoEditar = ref(null)
const gastoEliminar = ref(null)
const lastTranscript = ref('')
const toastMsg = ref('')
const hasDraft = ref(false)

const { currencySymbol, formatMonto } = useCurrency()
const { exportarCsv } = useExportCsv()

function exportarGastos() {
  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const columnas = [
    { label: 'Fecha', getValue: g => g.fecha },
    { label: 'Hora', getValue: g => g.hora || '' },
    { label: 'Concepto', getValue: g => g.concepto },
    { label: 'Categoría', getValue: g => g.categoriaNombre || '' },
    { label: 'Monto', getValue: g => g.monto },
    { label: 'Método', getValue: g => g.metodoRegistro || '' },
    { label: 'Notas', getValue: g => g.notas || '' },
  ]
  exportarCsv(`gastos_${MESES[mesSeleccionado.value]}_${anioSeleccionado.value}`, columnas, gastosMensuales.value)
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

// Voice recording
function onStartListening() {
  resetTranscript()
  clearParsed()
  hasDraft.value = false
  startListening()
}

function onStopListening() {
  stopListening()
}

// Auto-show draft whenever recognition stops and there's text
watch(isListening, (listening, wasListening) => {
  if (wasListening && !listening) {
    setTimeout(() => {
      if (transcript.value?.trim()) {
        hasDraft.value = true
      }
    }, 300)
  }
})

function onContinueListening() {
  continueListening()
  hasDraft.value = false
}

function onSendDraft() {
  if (transcript.value?.trim()) {
    lastTranscript.value = transcript.value
    hasDraft.value = false
    showConfirmacion.value = true
    parseVoiceText(transcript.value)
  }
}

function onDiscardDraft() {
  hasDraft.value = false
  resetTranscript()
  clearParsed()
}

function onOverwriteDraft() {
  hasDraft.value = false
  resetTranscript()
  clearParsed()
  startListening()
}

function onUpdateTranscript(newText) {
  transcript.value = newText
}

async function onConfirmGastos(gastosEditados) {
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

  try {
    await createGastosBulk(gastosConIds, lastTranscript.value)
    showConfirmacion.value = false
    hasDraft.value = false
    resetTranscript()
    clearParsed()
    showToast(`${gastosEditados.length} gasto${gastosEditados.length > 1 ? 's' : ''} registrado${gastosEditados.length > 1 ? 's' : ''}`)
    await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
  } catch {
    // Error handled by composable
  }
}

function reintentarParse() {
  if (lastTranscript.value) {
    parseVoiceText(lastTranscript.value)
  }
}

function cerrarConfirmacion() {
  showConfirmacion.value = false
  clearParsed()
  resetTranscript()
  hasDraft.value = false
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

async function ejecutarEliminar() {
  if (!gastoEliminar.value) return
  try {
    await deleteGasto(gastoEliminar.value.id)
    showToast('Gasto eliminado')
    await Promise.all([fetchGastosMensuales(), fetchResumenMensual()])
  } catch {
    // Error handled by composable
  }
  gastoEliminar.value = null
}

// Re-fetch when month changes
watch([mesSeleccionado, anioSeleccionado], async () => {
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual(), fetchPresupuesto()])
})

async function fetchResumenMensual() {
  const hoy = new Date().toISOString().split('T')[0]
  await fetchResumen(hoy, mesSeleccionado.value, anioSeleccionado.value)
}

// Initial load
onMounted(async () => {
  await Promise.all([fetchGastosMensuales(), fetchResumenMensual(), fetchCategorias(), fetchPresupuesto()])
})
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
