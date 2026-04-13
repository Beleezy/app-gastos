<template>
  <SharedBaseBottomSheet :title="gasto.gastoRegistradoId ? 'Editar registro de gasto' : 'Registrar pago'" @close="$emit('close')">
    <div class="rounded-2xl border border-theme-border bg-theme-input p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-theme-text">{{ gasto.concepto }}</p>
          <p class="mt-1 text-xs text-theme-text-sec">
            {{ gasto.categoriaNombre || 'Sin categoria' }} · {{ formatFecha(gasto.fechaProbablePago) }}
          </p>
        </div>
        <p class="text-sm font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(gasto.montoEstimado) }}</p>
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Fecha de pago</label>
      <input
        v-model="form.fechaPago"
        type="date"
        class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text focus:border-theme-accent focus:outline-none focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Nota <span class="text-theme-text-muted">(opcional)</span></label>
      <textarea
        v-model="form.notas"
        rows="3"
        placeholder="Ej: pagado por transferencia, cuota completa..."
        class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:border-theme-accent focus:outline-none focus:ring-1 focus:ring-theme-accent transition-colors"
      ></textarea>
    </div>

    <p v-if="errorMsg" class="text-xs text-red-400">{{ errorMsg }}</p>

    <button
      class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-theme-text transition-colors"
      :class="saving ? 'bg-theme-accent cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'"
      :disabled="saving"
      @click="guardar"
    >
      <svg v-if="saving" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      {{ saving ? 'Guardando...' : gasto.gastoRegistradoId ? 'Actualizar registro' : 'Registrar en gastos' }}
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  gasto: { type: Object, required: true },
})

const emit = defineEmits(['close', 'saved'])

const hoy = new Date().toISOString().split('T')[0]

const form = reactive({
  fechaPago: props.gasto.gastoRegistradoFecha || props.gasto.fechaProbablePago || hoy,
  notas: props.gasto.gastoRegistradoNotas || '',
})

const saving = ref(false)
const errorMsg = ref('')

const { registrarGastoEnRegistro } = usePlanificador()
const { success, error: toastError } = useToast()
const { currencySymbol, formatMonto } = useCurrency()

function formatFecha(fecha) {
  if (!fecha) return 'Sin fecha programada'
  const d = new Date(`${fecha}T00:00:00`)
  return d.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function guardar() {
  errorMsg.value = ''

  if (!form.fechaPago) {
    errorMsg.value = 'Selecciona la fecha de pago'
    return
  }

  saving.value = true
  try {
    await registrarGastoEnRegistro(props.gasto.id, {
      fechaPago: form.fechaPago,
      notas: form.notas?.trim() || null,
    })
    success(props.gasto.gastoRegistradoId ? 'Registro actualizado' : 'Gasto enviado al registro')
    emit('saved')
    emit('close')
  } catch (e) {
    toastError(handleApiError(e))
  } finally {
    saving.value = false
  }
}
</script>
