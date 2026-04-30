<template>
  <div>
    <LayoutAppHeader>
      <template #title>Deudas y Pagos</template>
      <template #actions>
        <SharedExportButton
          :formats="['excel', 'csv']"
          label="Exportar"
          @select="exportarDeudas"
        />
      </template>
    </LayoutAppHeader>

    <!-- Pull-to-refresh indicator -->
    <Transition name="ptr">
      <div v-if="isRefreshing" class="flex justify-center py-2">
        <svg class="animate-spin w-5 h-5 text-theme-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    </Transition>

    <!-- Notificaciones de vínculos pendientes -->
    <div class="px-4 lg:px-0">
      <DeudasNotificacionesVinculo @vinculo-aceptado="onVinculoAceptado" />
    </div>

    <!-- Balance global (vista panorámica de "Me deben" - "Yo debo") -->
    <div v-if="!personaSeleccionada" class="px-4 lg:px-0 mt-3">
      <DeudasBalanceGlobal />
    </div>

    <!-- Desktop 2-column grid: sidebar (resumen) + contenido (lista/detalle) -->
    <div class="lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] lg:gap-6">
      <!-- Sidebar izquierdo (sticky en desktop) -->
      <div class="lg:sticky lg:top-20 lg:self-start lg:pt-4">
        <DeudasResumenDeudas />

        <!-- Botón volver a la lista (solo en detalle, desktop) -->
        <div v-if="personaSeleccionada" class="hidden lg:block px-0 mt-2">
          <button
            class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-theme-card border border-theme-border text-theme-text-sec text-sm font-medium hover:text-theme-text hover:border-theme-accent/40 transition-colors"
            @click="seleccionarPersona(null)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a la lista
          </button>
        </div>
      </div>

      <!-- Vista principal: Lista de personas o Detalle de persona -->
      <div>
        <Transition name="page" mode="out-in">
          <div :key="personaSeleccionada ? 'detalle' : 'lista'">
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
          </div>
        </Transition>
      </div>
    </div>

    <!-- FABs: Voz + Manual (hidden when voice overlay is active) -->
    <div v-if="!showVozOverlay" class="fixed right-4 bottom-24 lg:right-8 lg:bottom-8 z-40 flex flex-col gap-3 items-center">
      <button
        class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-90 bg-purple-600 opacity-70 hover:opacity-85 shadow-purple-500/25"
        @click="abrirVozOverlay"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      <button
        class="w-12 h-12 rounded-full bg-theme-accent opacity-70 hover:opacity-85 active:scale-90 shadow-lg shadow-theme-accent/25 flex items-center justify-center transition-all duration-300 fab-pulse"
        @click="showFormDeuda = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-on-accent drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Voice overlay -->
    <DeudasVozOverlayDeuda />

    <!-- Confirmación de deudas por voz -->
    <DeudasConfirmacionVozDeuda />

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
} = useDeudas()

const { showVozOverlay, abrirVozOverlay } = useVoiceDeuda()

const { exportarExcel } = useExportExcel()

const { fetchPendientes: fetchVinculosPendientes } = useVinculos()

async function onVinculoAceptado() {
  await Promise.all([fetchResumen(), fetchPersonas()])
}

function exportarDeudas(formato) {
  const columnas = [
    { label: 'Persona', getValue: p => p.nombre },
    { label: 'Tipo', getValue: p => p.tipoDeuda === 'me_deben' ? 'Me debe' : 'Yo debo' },
    { label: 'Total Pendiente', getValue: p => p.totalPendiente },
    { label: 'Deudas Activas', getValue: p => p.deudasActivas },
    { label: 'Último Movimiento', getValue: p => p.ultimoMovimiento || '' },
  ]
  const filas = personas.value || []
  if (formato === 'csv') {
    const { descargar } = useExportCsv()
    descargar({ nombreArchivo: 'deudas_resumen', columnas, filas })
    return
  }
  exportarExcel('deudas_resumen', columnas, filas)
}

const showFormDeuda = ref(false)
const showFormPago = ref(false)
const showFormEditar = ref(false)
const showFormPagoGlobal = ref(false)
const deudaParaPago = ref(null)
const deudaParaEditar = ref(null)

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

watch(tabActual, () => {
  fetchPersonas()
})

const { isRefreshing } = usePullToRefresh(async () => {
  await Promise.all([fetchResumen(), fetchPersonas()])
})

onMounted(async () => {
  await Promise.all([fetchResumen(), fetchPersonas(), fetchVinculosPendientes()])
})
</script>
