<template>
  <div>
    <LayoutAppHeader>
      <template #title>Deudas y Pagos</template>
      <template #actions>
        <button
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-emerald-400 transition-colors"
          @click="exportarDeudas"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
      </template>
    </LayoutAppHeader>

    <!-- Resumen (balance general + tabs) -->
    <DeudasResumenDeudas />

    <!-- Vista: Lista de personas o Detalle de persona -->
    <DeudasDetallePersona
      v-if="personaSeleccionada"
      @registrar-pago="abrirFormPago"
      @agregar-deuda="showFormDeuda = true"
      @editar-deuda="abrirFormEditar"
      @pago-global="showFormPagoGlobal = true"
    />
    <DeudasListaPersonas
      v-else
      @seleccionar="onSeleccionarPersona"
    />

    <!-- FABs: Voz + Manual (hidden when voice overlay is active) -->
    <div v-if="!showVozOverlay" class="fixed right-4 bottom-24 z-40 flex flex-col gap-3 items-center">
      <!-- Botón Voz -->
      <button
        class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-90 bg-gradient-to-br from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 shadow-purple-500/25"
        @click="abrirVozOverlay"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      <!-- Botón Manual -->
      <button
        class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 active:scale-90 shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all duration-300 fab-pulse"
        @click="showFormDeuda = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Voice overlay (covers content with blur) -->
    <Transition name="voz-overlay">
      <div v-if="showVozOverlay" class="fixed inset-0 z-50 flex flex-col items-center justify-center">
        <!-- Backdrop blur -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cerrarVozOverlaySiInactivo"></div>

        <div class="relative z-10 flex flex-col items-center gap-4 px-6 w-full max-w-sm">
          <!-- Status text -->
          <p class="text-sm h-5">
            <span v-if="isListeningDeuda" class="text-purple-400">Escuchando...</span>
            <span v-else-if="hasDraftDeuda" class="text-amber-400">Borrador guardado</span>
            <span v-else class="text-gray-400">Toca para dictar una deuda</span>
          </p>

          <!-- Mic button -->
          <div class="relative">
            <div v-if="isListeningDeuda" class="absolute inset-0 flex items-center justify-center">
              <div class="absolute w-24 h-24 rounded-full bg-purple-500/20 animate-ping-slow"></div>
              <div class="absolute w-32 h-32 rounded-full bg-purple-500/10 animate-ping-slower"></div>
            </div>
            <button
              class="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-xl"
              :class="isListeningDeuda
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
                : 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/40'"
              @click="toggleVozDeuda"
            >
              <svg v-if="!isListeningDeuda" xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>

          <!-- Audio wave -->
          <div v-if="isListeningDeuda" class="flex items-center gap-1 h-8">
            <div v-for="i in 5" :key="i"
              class="w-1 bg-purple-400 rounded-full animate-wave"
              :style="{ animationDelay: `${i * 0.1}s`, height: `${12 + Math.random() * 20}px` }"
            ></div>
          </div>

          <!-- Live transcript while recording -->
          <div v-if="isListeningDeuda && transcriptDeuda" class="w-full">
            <div class="bg-primary-800/90 rounded-xl px-4 py-3 border border-primary-700/50">
              <p class="text-sm text-gray-300 italic">"{{ transcriptDeuda }}"</p>
            </div>
          </div>

          <!-- Draft card (after recording stops) -->
          <div v-if="hasDraftDeuda && !isListeningDeuda" class="w-full">
            <div class="bg-primary-800/90 rounded-xl px-4 py-3 border border-amber-500/30">
              <p class="text-xs text-amber-400/70 mb-1.5">Borrador</p>

              <!-- Editable text -->
              <div v-if="isEditingDeuda">
                <textarea
                  ref="editTextareaRef"
                  v-model="editTextDeuda"
                  class="w-full bg-primary-900/60 border border-primary-600/40 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-500/50"
                  rows="3"
                  @keydown.enter.ctrl="saveEditDeuda"
                ></textarea>
                <div class="flex items-center gap-2 mt-2">
                  <button class="flex-1 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-medium hover:bg-purple-500/25" @click="saveEditDeuda">
                    Guardar
                  </button>
                  <button class="flex-1 py-1.5 rounded-lg bg-primary-700/30 text-gray-400 text-xs font-medium hover:bg-primary-700/50" @click="isEditingDeuda = false">
                    Cancelar
                  </button>
                </div>
              </div>

              <!-- Read-only text -->
              <p v-else class="text-sm text-gray-300 italic">"{{ transcriptDeuda }}"</p>

              <!-- Draft actions -->
              <div v-if="!isEditingDeuda" class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-primary-700/40">
                <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25" @click="enviarDraftDeuda">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Enviar
                </button>
                <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25" @click="startEditDeuda">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Editar
                </button>
                <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-medium hover:bg-purple-500/25" @click="regrabarDeuda">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Regrabar
                </button>
                <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20" @click="descartarDraftDeuda">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <!-- Close button (when not recording and no draft) -->
          <button
            v-if="!isListeningDeuda && !hasDraftDeuda"
            class="mt-2 px-6 py-2 rounded-xl text-sm text-gray-400 border border-primary-700/50 hover:bg-primary-700/30 transition-colors"
            @click="cerrarVozOverlay"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Transition>

    <!-- Confirmación de deudas por voz -->
    <div v-if="showConfirmVoz" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cerrarConfirmVoz"></div>
      <div class="relative w-full max-w-lg bg-primary-800 rounded-t-3xl border-t border-primary-700/50 max-h-[80vh] overflow-y-auto animate-slide-up">
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full bg-primary-700"></div>
        </div>
        <div class="px-5 pb-6">
          <h2 class="text-lg font-semibold text-white mb-1">{{ pagosParseados.length > 0 && deudasParseadas.length === 0 ? 'Pagos detectados' : deudasParseadas.length > 0 && pagosParseados.length > 0 ? 'Deudas y pagos detectados' : 'Deudas detectadas' }}</h2>
          <p class="text-xs text-gray-500 mb-4 italic">"{{ vozTranscript }}"</p>

          <div v-if="vozParsing" class="flex items-center justify-center py-8">
            <div class="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="ml-3 text-sm text-gray-400">Interpretando...</span>
          </div>

          <div v-else-if="vozError" class="text-center py-6">
            <p class="text-sm text-red-400 mb-3">{{ vozError }}</p>
            <button class="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm" @click="reintentarParseDeuda">Reintentar</button>
          </div>

          <div v-else-if="deudasParseadas.length > 0 || pagosParseados.length > 0" class="space-y-3">
            <!-- Deudas nuevas -->
            <template v-if="deudasParseadas.length > 0">
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Deudas nuevas</p>
              <div v-for="(d, i) in deudasParseadas" :key="'d-'+i"
                class="bg-primary-900/60 rounded-xl p-3 border border-primary-700/30">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    :class="d.tipo === 'me_deben' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'">
                    {{ d.tipo === 'me_deben' ? 'Me debe' : 'Yo debo' }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label class="text-[10px] text-gray-500">Persona</label>
                    <input v-model="d.persona" class="w-full px-2 py-1.5 rounded-lg bg-primary-800 border border-primary-700/40 text-white text-xs" />
                  </div>
                  <div>
                    <label class="text-[10px] text-gray-500">Monto</label>
                    <input v-model.number="d.monto" type="number" step="0.01" class="w-full px-2 py-1.5 rounded-lg bg-primary-800 border border-primary-700/40 text-white text-xs" />
                  </div>
                  <div class="col-span-2">
                    <label class="text-[10px] text-gray-500">Concepto</label>
                    <input v-model="d.concepto" class="w-full px-2 py-1.5 rounded-lg bg-primary-800 border border-primary-700/40 text-white text-xs" />
                  </div>
                </div>
              </div>
            </template>

            <!-- Pagos -->
            <template v-if="pagosParseados.length > 0">
              <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Pagos</p>
              <div v-for="(p, i) in pagosParseados" :key="'p-'+i"
                class="bg-primary-900/60 rounded-xl p-3 border border-blue-500/30">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400">
                    Pago
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label class="text-[10px] text-gray-500">Persona</label>
                    <input v-model="p.persona" class="w-full px-2 py-1.5 rounded-lg bg-primary-800 border border-primary-700/40 text-white text-xs" />
                  </div>
                  <div>
                    <label class="text-[10px] text-gray-500">Monto</label>
                    <input v-model.number="p.monto" type="number" step="0.01" class="w-full px-2 py-1.5 rounded-lg bg-primary-800 border border-primary-700/40 text-white text-xs" />
                  </div>
                  <div class="col-span-2">
                    <label class="text-[10px] text-gray-500">Notas</label>
                    <input v-model="p.notas" placeholder="Opcional..." class="w-full px-2 py-1.5 rounded-lg bg-primary-800 border border-primary-700/40 text-white text-xs placeholder-gray-600" />
                  </div>
                </div>
              </div>
            </template>

            <div class="flex gap-3 mt-4">
              <button class="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-primary-700/50 hover:bg-primary-700/30" @click="cerrarConfirmVoz">
                Descartar
              </button>
              <button
                class="flex-1 py-2.5 rounded-xl text-sm text-white bg-purple-500 hover:bg-purple-600 font-medium"
                :disabled="guardandoVoz"
                @click="confirmarDeudasVoz"
              >
                {{ guardandoVoz ? 'Guardando...' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Deuda Modal -->
    <DeudasFormDeuda
      v-if="showFormDeuda"
      :persona-predefinida="personaSeleccionada"
      @close="showFormDeuda = false"
      @saved="onDeudaCreated"
    />

    <!-- Form Pago Modal -->
    <DeudasFormPago
      v-if="showFormPago && deudaParaPago"
      :deuda="deudaParaPago"
      @close="cerrarFormPago"
      @saved="cerrarFormPago"
    />

    <!-- Form Editar Deuda Modal -->
    <DeudasFormEditarDeuda
      v-if="showFormEditar && deudaParaEditar"
      :deuda="deudaParaEditar"
      @close="cerrarFormEditar"
      @saved="onDeudaEditada"
    />

    <!-- Form Pago Global Modal -->
    <DeudasFormPagoGlobal
      v-if="showFormPagoGlobal && personaSeleccionada"
      :persona="personaSeleccionada"
      :total-pendiente="totalPendientePersona"
      :deudas-activas="deudasActivasPersona.length"
      @close="showFormPagoGlobal = false"
      @saved="showFormPagoGlobal = false"
    />
  </div>
</template>

<script setup>
const {
  fetchResumen, fetchPersonas, personas,
  personaSeleccionada, seleccionarPersona,
  fetchDeudasPersona, fetchPagosPersona, tabActual,
  totalPendientePersona, deudasActivasPersona,
  createDeuda,
} = useDeudas()

const { exportarExcel } = useExportExcel()
const { currencySymbol: _cs, formatMonto: _fm } = useCurrency()

function exportarDeudas() {
  const columnas = [
    { label: 'Persona', getValue: p => p.nombre },
    { label: 'Tipo', getValue: p => p.tipoDeuda === 'me_deben' ? 'Me debe' : 'Yo debo' },
    { label: 'Total Pendiente', getValue: p => p.totalPendiente },
    { label: 'Deudas Activas', getValue: p => p.deudasActivas },
    { label: 'Último Movimiento', getValue: p => p.ultimoMovimiento || '' },
  ]
  const personas_data = personas.value || []
  exportarExcel('deudas_resumen', columnas, personas_data)
}

const showFormDeuda = ref(false)
const showFormPago = ref(false)
const showFormEditar = ref(false)
const showFormPagoGlobal = ref(false)
const deudaParaPago = ref(null)
const deudaParaEditar = ref(null)

// --- Voz para deudas ---
const { isListening: isListeningDeuda, transcript: transcriptDeuda, startListening, continueListening, stopListening, resetTranscript } = useVoiceRecognition()
const showVozOverlay = ref(false)
const hasDraftDeuda = ref(false)
const isEditingDeuda = ref(false)
const editTextDeuda = ref('')
const editTextareaRef = ref(null)
const showConfirmVoz = ref(false)
const vozTranscript = ref('')
const vozParsing = ref(false)
const vozError = ref('')
const deudasParseadas = ref([])
const pagosParseados = ref([])
const guardandoVoz = ref(false)

function abrirVozOverlay() {
  showVozOverlay.value = true
  resetTranscript()
  hasDraftDeuda.value = false
  isEditingDeuda.value = false
  startListening()
}

function cerrarVozOverlay() {
  showVozOverlay.value = false
  hasDraftDeuda.value = false
  isEditingDeuda.value = false
  if (isListeningDeuda.value) stopListening()
  resetTranscript()
}

function cerrarVozOverlaySiInactivo() {
  if (!isListeningDeuda.value && !hasDraftDeuda.value) {
    cerrarVozOverlay()
  }
}

function toggleVozDeuda() {
  if (isListeningDeuda.value) {
    stopListening()
  } else {
    resetTranscript()
    hasDraftDeuda.value = false
    startListening()
  }
}

// Auto-show draft when recording stops with text
watch(isListeningDeuda, (listening, was) => {
  if (was && !listening) {
    setTimeout(() => {
      if (transcriptDeuda.value?.trim()) {
        hasDraftDeuda.value = true
      }
    }, 300)
  }
})

function enviarDraftDeuda() {
  if (transcriptDeuda.value?.trim()) {
    vozTranscript.value = transcriptDeuda.value
    hasDraftDeuda.value = false
    showVozOverlay.value = false
    showConfirmVoz.value = true
    parsearDeudaVoz()
  }
}

function startEditDeuda() {
  editTextDeuda.value = transcriptDeuda.value
  isEditingDeuda.value = true
  nextTick(() => {
    editTextareaRef.value?.focus()
  })
}

function saveEditDeuda() {
  transcriptDeuda.value = editTextDeuda.value
  isEditingDeuda.value = false
}

function regrabarDeuda() {
  hasDraftDeuda.value = false
  isEditingDeuda.value = false
  resetTranscript()
  startListening()
}

function descartarDraftDeuda() {
  hasDraftDeuda.value = false
  isEditingDeuda.value = false
  resetTranscript()
  cerrarVozOverlay()
}

async function parsearDeudaVoz() {
  vozParsing.value = true
  vozError.value = ''
  try {
    const result = await $fetch('/api/voz/parse', {
      method: 'POST',
      body: { texto: vozTranscript.value, modo: 'deudas' }
    })
    deudasParseadas.value = result.deudas || []
    pagosParseados.value = result.pagos || []
  } catch (e) {
    vozError.value = e.data?.message || 'Error al interpretar el audio. Intenta de nuevo con frases claras como "Juan me debe 20 soles por almuerzo".'
  } finally {
    vozParsing.value = false
  }
}

function reintentarParseDeuda() {
  parsearDeudaVoz()
}

function cerrarConfirmVoz() {
  showConfirmVoz.value = false
  deudasParseadas.value = []
  pagosParseados.value = []
  vozError.value = ''
  resetTranscript()
}

async function confirmarDeudasVoz() {
  guardandoVoz.value = true
  try {
    // Save new debts
    for (const d of deudasParseadas.value) {
      await createDeuda({
        personaNombre: d.persona,
        tipoDeuda: d.tipo,
        concepto: d.concepto,
        montoOriginal: d.monto,
        fechaCreacion: d.fecha || new Date().toISOString().split('T')[0],
      })
    }

    // Process payments - find persona by name and use pago-global endpoint
    for (const p of pagosParseados.value) {
      // Fetch all personas to find best match
      const todasPersonas = await $fetch('/api/deudas/personas')
      const nombreLower = p.persona.toLowerCase()
      const personaMatch = todasPersonas.find(pe =>
        pe.nombre.toLowerCase() === nombreLower
      )
      if (personaMatch && personaMatch.totalPendiente > 0) {
        await $fetch(`/api/deudas/personas/${personaMatch.id}/pago-global`, {
          method: 'POST',
          body: {
            monto: p.monto,
            fecha: p.fecha || new Date().toISOString().split('T')[0],
            notas: p.notas || 'Pago registrado por voz',
          }
        })
      }
    }

    cerrarConfirmVoz()
    await Promise.all([fetchResumen(), fetchPersonas()])
    if (personaSeleccionada.value) {
      await Promise.all([
        fetchDeudasPersona(personaSeleccionada.value.id),
        fetchPagosPersona(personaSeleccionada.value.id),
      ])
    }
  } catch (e) {
    vozError.value = 'Error al guardar'
  } finally {
    guardandoVoz.value = false
  }
}

function onSeleccionarPersona(persona) {
  seleccionarPersona(persona)
  fetchDeudasPersona(persona.id)
  fetchPagosPersona(persona.id)
}

function abrirFormPago(deuda) {
  deudaParaPago.value = deuda
  showFormPago.value = true
}

function cerrarFormPago() {
  showFormPago.value = false
  deudaParaPago.value = null
}

function abrirFormEditar(deuda) {
  deudaParaEditar.value = deuda
  showFormEditar.value = true
}

function cerrarFormEditar() {
  showFormEditar.value = false
  deudaParaEditar.value = null
}

async function onDeudaEditada() {
  cerrarFormEditar()
}

async function onDeudaCreated() {
  showFormDeuda.value = false
  await fetchPersonas()
  if (personaSeleccionada.value) {
    await fetchDeudasPersona(personaSeleccionada.value.id)
  }
}

// Watch tab changes to re-fetch personas
watch(tabActual, () => {
  fetchPersonas()
})

onMounted(async () => {
  await Promise.all([fetchResumen(), fetchPersonas()])
})
</script>

<style scoped>
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes ping-slower {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(2); opacity: 0; }
}
@keyframes wave {
  0%, 100% { height: 8px; }
  50% { height: 28px; }
}
.animate-ping-slow {
  animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-ping-slower {
  animation: ping-slower 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-wave {
  animation: wave 0.8s ease-in-out infinite;
}
.voz-overlay-enter-active {
  transition: all 0.3s ease-out;
}
.voz-overlay-leave-active {
  transition: all 0.2s ease-in;
}
.voz-overlay-enter-from,
.voz-overlay-leave-to {
  opacity: 0;
}
</style>
