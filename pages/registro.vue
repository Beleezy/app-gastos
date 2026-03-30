<template>
  <div>
    <LayoutAppHeader>
      <template #title>Registro de Gastos</template>
      <template #actions>
        <button
          class="w-8 h-8 rounded-full bg-primary-700/60 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          @click="showFormManual = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto">
      <!-- Date navigator -->
      <div class="flex items-center justify-between px-4 py-3">
        <button
          class="w-9 h-9 rounded-full bg-primary-800/60 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary-700/60 transition-colors"
          @click="diaAnterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="text-center">
          <button
            class="text-base font-semibold text-white hover:text-indigo-400 transition-colors"
            @click="irAHoy"
          >
            {{ fechaFormateada }}
          </button>
          <p class="text-xs text-gray-500 mt-0.5" v-if="!esHoy">
            Toca para ir a hoy
          </p>
        </div>

        <button
          class="w-9 h-9 rounded-full bg-primary-800/60 flex items-center justify-center transition-colors"
          :class="esHoy ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-primary-700/60'"
          :disabled="esHoy"
          @click="diaSiguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-2 gap-3 px-4 mb-5">
        <div class="bg-primary-800/60 rounded-xl border border-primary-700/30 px-4 py-3">
          <p class="text-xs text-gray-500 mb-1">Hoy</p>
          <p class="text-xl font-bold text-white">S/ {{ formatMonto(resumen.totalDia) }}</p>
        </div>
        <div class="bg-primary-800/60 rounded-xl border border-primary-700/30 px-4 py-3">
          <p class="text-xs text-gray-500 mb-1">Este mes</p>
          <p class="text-xl font-bold text-indigo-400">S/ {{ formatMonto(resumen.totalMes) }}</p>
        </div>
      </div>

      <!-- Microphone section -->
      <div class="py-4 mb-4">
        <RegistroBotonMicrofono
          :is-listening="isListening"
          :transcript="transcript"
          :error="voiceError"
          :is-supported="isSupported"
          @start="onStartListening"
          @stop="onStopListening"
        />
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-3 px-4 mb-4">
        <div class="flex-1 h-px bg-primary-700/50"></div>
        <span class="text-xs text-gray-600">Historial</span>
        <div class="flex-1 h-px bg-primary-700/50"></div>
      </div>

      <!-- Daily history -->
      <RegistroHistorialDiario
        :gastos="gastosPorHora"
        :is-loading="isLoading"
        @edit="abrirEdicion"
        @delete="confirmarEliminar"
      />

      <div class="h-8"></div>
    </div>

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
      <div class="relative bg-primary-800 rounded-2xl border border-primary-700/50 p-6 mx-4 max-w-sm w-full">
        <h3 class="text-base font-semibold text-white mb-2">Eliminar gasto</h3>
        <p class="text-sm text-gray-400 mb-1">
          {{ gastoEliminar.concepto }}
        </p>
        <p class="text-sm text-gray-500 mb-5">
          S/ {{ formatMonto(gastoEliminar.monto) }}
        </p>
        <div class="flex gap-3">
          <button
            class="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-primary-700/50 hover:bg-primary-700/30 transition-colors"
            @click="gastoEliminar = null"
          >
            Cancelar
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl text-sm text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors"
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
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg backdrop-blur-sm"
      >
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
const {
  gastos: _gastos, categorias, resumen, isLoading,
  fechaSeleccionada, fechaFormateada, esHoy, gastosPorHora,
  fetchGastos, fetchResumen, fetchCategorias,
  createGastosBulk, deleteGasto,
  diaAnterior, diaSiguiente, irAHoy,
  getCategoriaPorNombre,
} = useGastos()

const { isListening, transcript, error: voiceError, isSupported, startListening, stopListening, resetTranscript } = useVoiceRecognition()
const { isParsing, parsedExpenses, error: parseError, parseVoiceText, clearParsed } = useLLMParser()

const showConfirmacion = ref(false)
const showFormManual = ref(false)
const gastoEditar = ref(null)
const gastoEliminar = ref(null)
const lastTranscript = ref('')
const toastMsg = ref('')

function formatMonto(monto) {
  return (parseFloat(monto) || 0).toFixed(2)
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

// Voice recording
function onStartListening() {
  resetTranscript()
  clearParsed()
  startListening()
}

function onStopListening() {
  stopListening()
  // Wait briefly for final transcript
  setTimeout(() => {
    if (transcript.value?.trim()) {
      lastTranscript.value = transcript.value
      showConfirmacion.value = true
      parseVoiceText(transcript.value)
    }
  }, 300)
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
    resetTranscript()
    clearParsed()
    showToast(`${gastosEditados.length} gasto${gastosEditados.length > 1 ? 's' : ''} registrado${gastosEditados.length > 1 ? 's' : ''}`)
    await fetchGastos()
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
  await fetchGastos()
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
  } catch {
    // Error handled by composable
  }
  gastoEliminar.value = null
}

// Re-fetch when date changes
watch(fechaSeleccionada, async () => {
  await Promise.all([fetchGastos(), fetchResumen()])
})

// Initial load
onMounted(async () => {
  await Promise.all([fetchGastos(), fetchResumen(), fetchCategorias()])
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
