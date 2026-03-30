<template>
  <div>
    <LayoutAppHeader>
      <template #title>Deudas y Pagos</template>
    </LayoutAppHeader>

    <!-- Resumen (balance general + tabs) -->
    <DeudasResumenDeudas />

    <!-- Vista: Lista de personas o Detalle de persona -->
    <DeudasDetallePersona
      v-if="personaSeleccionada"
      @registrar-pago="abrirFormPago"
      @agregar-deuda="showFormDeuda = true"
    />
    <DeudasListaPersonas
      v-else
      @seleccionar="onSeleccionarPersona"
    />

    <!-- FAB - Floating Action Button -->
    <button
      class="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all active:scale-95"
      @click="showFormDeuda = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>

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
  </div>
</template>

<script setup>
const {
  fetchResumen, fetchPersonas,
  personaSeleccionada, seleccionarPersona,
  fetchDeudasPersona, tabActual,
} = useDeudas()

const showFormDeuda = ref(false)
const showFormPago = ref(false)
const deudaParaPago = ref(null)

function onSeleccionarPersona(persona) {
  seleccionarPersona(persona)
  fetchDeudasPersona(persona.id)
}

function abrirFormPago(deuda) {
  deudaParaPago.value = deuda
  showFormPago.value = true
}

function cerrarFormPago() {
  showFormPago.value = false
  deudaParaPago.value = null
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
