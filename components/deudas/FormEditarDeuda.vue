<template>
  <SharedBaseBottomSheet title="Editar deuda" @close="$emit('close')">
    <!-- Concepto -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Concepto</label>
      <input
        v-model="form.concepto"
        type="text"
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <!-- Monto -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Monto original</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-text-sec">{{ currencySymbol }}</span>
        <input
          v-model="form.montoOriginal"
          type="number"
          step="0.01"
          class="w-full pl-9 pr-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
      <p v-if="totalPagado > 0" class="text-[10px] text-theme-text-muted mt-1">
        Ya se han pagado {{ currencySymbol }}&nbsp;{{ formatMonto(totalPagado) }}. El pendiente se recalculara automaticamente.
      </p>
    </div>

    <!-- Fecha de creacion -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Fecha del prestamo</label>
      <input
        v-model="form.fechaCreacion"
        type="date"
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <!-- Fecha de pago -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Fecha de pago <span class="text-theme-text-muted">(opcional)</span></label>
      <input
        v-model="form.fechaPago"
        type="date"
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <!-- Notas -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Notas <span class="text-theme-text-muted">(opcional)</span></label>
      <textarea
        v-model="form.notas"
        rows="2"
        placeholder="Agregar notas o detalles..."
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
      ></textarea>
    </div>

    <template #footer>
      <p v-if="errorMsg" class="text-red-400 text-xs mb-2">{{ errorMsg }}</p>

      <button
        class="w-full py-3.5 rounded-xl text-theme-on-accent font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        :class="saving ? 'bg-theme-accent cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'"
        :disabled="saving"
        @click="guardar"
      >
        <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        {{ saving ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  deuda: { type: Object, required: true },
})

const emit = defineEmits(['close', 'saved'])

const { updateDeuda } = useDeudas()

const totalPagado = computed(() => {
  return Math.max(0, props.deuda.montoOriginal - props.deuda.montoPendiente)
})

const form = reactive({
  concepto: props.deuda.concepto,
  montoOriginal: props.deuda.montoOriginal,
  fechaCreacion: props.deuda.fechaCreacion,
  fechaPago: props.deuda.fechaPago || '',
  notas: props.deuda.notas || '',
})

const saving = ref(false)
const errorMsg = ref('')

const { currencySymbol, formatMonto } = useCurrency()

async function guardar() {
  errorMsg.value = ''

  if (!form.concepto?.trim()) {
    errorMsg.value = 'El concepto es obligatorio'
    return
  }
  if (!form.montoOriginal || form.montoOriginal <= 0) {
    errorMsg.value = 'Ingresa un monto valido'
    return
  }

  saving.value = true
  try {
    await updateDeuda(props.deuda.id, {
      concepto: form.concepto.trim(),
      montoOriginal: parseFloat(form.montoOriginal),
      fechaCreacion: form.fechaCreacion,
      fechaPago: form.fechaPago || null,
      notas: form.notas?.trim() || null,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    useToast().error(handleApiError(e))
  } finally {
    saving.value = false
  }
}
</script>
