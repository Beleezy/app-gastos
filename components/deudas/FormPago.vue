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
        <h2 class="text-lg font-semibold text-white">Registrar pago</h2>
        <button class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-gray-400" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="px-5 pb-8 space-y-4">
        <!-- Debt info card -->
        <div class="bg-primary-900/50 rounded-xl p-3 border border-primary-700/30">
          <p class="text-xs text-gray-500 mb-1">Deuda: {{ deuda.concepto }}</p>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-500">Original</p>
              <p class="text-sm font-medium text-gray-400">S/ {{ formatMonto(deuda.montoOriginal) }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-500">Pendiente</p>
              <p class="text-sm font-semibold" :class="deuda.tipoDeuda === 'me_deben' ? 'text-emerald-400' : 'text-red-400'">
                S/ {{ formatMonto(deuda.montoPendiente) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Monto del pago -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Monto del pago</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">S/</span>
            <input
              v-model="form.monto"
              type="number"
              step="0.01"
              :max="deuda.montoPendiente"
              placeholder="0.00"
              class="w-full pl-9 pr-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <!-- Quick amount buttons -->
          <div class="flex gap-2 mt-2">
            <button
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-900/50 text-gray-400 hover:bg-primary-700 transition-colors"
              @click="form.monto = deuda.montoPendiente"
            >
              Total (S/ {{ formatMonto(deuda.montoPendiente) }})
            </button>
            <button
              v-if="deuda.montoPendiente > 1"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-900/50 text-gray-400 hover:bg-primary-700 transition-colors"
              @click="form.monto = Math.round(deuda.montoPendiente / 2 * 100) / 100"
            >
              Mitad
            </button>
          </div>
        </div>

        <!-- Fecha -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Fecha del pago</label>
          <input
            v-model="form.fecha"
            type="date"
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <!-- Metodo de pago -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Metodo de pago <span class="text-gray-600">(opcional)</span></label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="metodo in metodos"
              :key="metodo"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              :class="form.metodoPago === metodo ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-primary-900/50 text-gray-500 border border-transparent'"
              @click="form.metodoPago = form.metodoPago === metodo ? null : metodo"
            >
              {{ metodo }}
            </button>
          </div>
        </div>

        <!-- Notas -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Notas <span class="text-gray-600">(opcional)</span></label>
          <textarea
            v-model="form.notas"
            rows="2"
            placeholder="Agregar notas del pago..."
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Validation errors -->
        <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

        <!-- Submit Button -->
        <button
          class="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
          :class="saving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'"
          :disabled="saving"
          @click="guardar"
        >
          <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ saving ? 'Registrando...' : 'Registrar pago' }}
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

const { registrarPago } = useDeudas()

const metodos = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta']

const form = reactive({
  monto: null,
  fecha: new Date().toISOString().split('T')[0],
  metodoPago: null,
  notas: '',
})

const saving = ref(false)
const errorMsg = ref('')

function formatMonto(valor) {
  return Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function guardar() {
  errorMsg.value = ''

  if (!form.monto || form.monto <= 0) {
    errorMsg.value = 'Ingresa un monto valido'
    return
  }
  if (form.monto > props.deuda.montoPendiente) {
    errorMsg.value = 'El monto no puede exceder la deuda pendiente'
    return
  }

  saving.value = true
  try {
    await registrarPago(props.deuda.id, {
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      metodoPago: form.metodoPago,
      notas: form.notas?.trim() || null,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    errorMsg.value = 'Error al registrar el pago'
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
