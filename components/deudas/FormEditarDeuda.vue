<template>
  <!-- Modal Overlay -->
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-lg bg-primary-800 rounded-t-3xl border-t border-primary-700/50 max-h-[90vh] overflow-y-auto animate-slide-up">
      <!-- Handle -->
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-primary-700"></div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between px-5 pb-4">
        <h2 class="text-lg font-semibold text-white">Editar deuda</h2>
        <button class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-gray-400" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="px-5 pb-8 space-y-4">
        <!-- Concepto -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Concepto</label>
          <input
            v-model="form.concepto"
            type="text"
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <!-- Monto -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Monto original</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{{ currencySymbol }}</span>
            <input
              v-model="form.montoOriginal"
              type="number"
              step="0.01"
              class="w-full pl-9 pr-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <p v-if="totalPagado > 0" class="text-[10px] text-gray-600 mt-1">
            Ya se han pagado {{ currencySymbol }} {{ formatMonto(totalPagado) }}. El pendiente se recalculara automaticamente.
          </p>
        </div>

        <!-- Fecha de creacion -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Fecha del prestamo</label>
          <input
            v-model="form.fechaCreacion"
            type="date"
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <!-- Fecha de pago -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Fecha de pago <span class="text-gray-600">(opcional)</span></label>
          <input
            v-model="form.fechaPago"
            type="date"
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <!-- Notas -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Notas <span class="text-gray-600">(opcional)</span></label>
          <textarea
            v-model="form.notas"
            rows="2"
            placeholder="Agregar notas o detalles..."
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Validation errors -->
        <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

        <!-- Submit Button -->
        <button
          class="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
          :class="saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'"
          :disabled="saving"
          @click="guardar"
        >
          <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
    </div>
  </div>
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
    errorMsg.value = 'Error al actualizar la deuda'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
