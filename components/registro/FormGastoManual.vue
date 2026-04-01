<template>
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
        <h2 class="text-lg font-semibold text-white">
          {{ editando ? 'Editar gasto' : 'Nuevo gasto' }}
        </h2>
        <button class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-gray-400" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="px-5 pb-8 space-y-4">
        <!-- Concepto con autocompletado -->
        <div class="relative">
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Concepto</label>
          <input
            v-model="form.concepto"
            type="text"
            placeholder="Ej: Almuerzo, Pasaje, Recibo de luz..."
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            @input="buscarConceptos"
            @focus="mostrarSugerencias = true"
            @blur="ocultarSugerencias"
            autocomplete="off"
          />
          <!-- Sugerencias -->
          <div
            v-if="mostrarSugerencias && sugerencias.length > 0 && form.concepto.length >= 2"
            class="absolute z-10 w-full mt-1 bg-primary-800 border border-primary-700/50 rounded-xl overflow-hidden shadow-lg"
          >
            <button
              v-for="(s, i) in sugerencias"
              :key="i"
              class="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-primary-700/50 flex items-center justify-between transition-colors"
              @mousedown.prevent="seleccionarSugerencia(s)"
            >
              <span>{{ s.concepto }}</span>
              <span class="text-xs text-gray-500">{{ s.count }}x</span>
            </button>
          </div>
        </div>

        <!-- Monto -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Monto</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{{ currencySymbol }}</span>
            <input
              v-model="form.monto"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full pl-9 pr-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <!-- Categoría -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Categoría</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="cat in categorias"
              :key="cat.id"
              class="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs transition-all"
              :class="form.categoriaId === cat.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-primary-700/50 bg-primary-900/50 hover:border-primary-600'"
              @click="form.categoriaId = cat.id"
            >
              <span class="text-base">{{ cat.icono || '📦' }}</span>
              <span class="truncate w-full text-center"
                :class="form.categoriaId === cat.id ? 'text-blue-400' : 'text-gray-400'"
              >{{ cat.nombre }}</span>
            </button>
          </div>
        </div>

        <!-- Fecha y Hora -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1.5">Fecha</label>
            <input
              v-model="form.fecha"
              type="date"
              class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1.5">Hora</label>
            <input
              v-model="form.hora"
              type="time"
              class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
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

        <!-- Validation error -->
        <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

        <!-- Submit -->
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
          {{ saving ? 'Guardando...' : (editando ? 'Actualizar gasto' : 'Registrar gasto') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  categorias: { type: Array, default: () => [] },
  gastoEditar: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const editando = computed(() => !!props.gastoEditar)

const ahora = new Date()

const form = reactive({
  concepto: props.gastoEditar?.concepto || '',
  monto: props.gastoEditar?.monto || null,
  categoriaId: props.gastoEditar?.categoriaId || null,
  fecha: props.gastoEditar?.fecha || ahora.toISOString().split('T')[0],
  hora: props.gastoEditar?.hora?.substring(0, 5) || ahora.toTimeString().split(' ')[0].substring(0, 5),
  notas: props.gastoEditar?.notas || '',
})

const saving = ref(false)
const errorMsg = ref('')
const sugerencias = ref([])
const mostrarSugerencias = ref(false)
let debounceTimer = null

const { currencySymbol } = useCurrency()
const { createGasto, updateGasto } = useGastos()

function buscarConceptos() {
  clearTimeout(debounceTimer)
  if (form.concepto.length < 2) {
    sugerencias.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      sugerencias.value = await $fetch('/api/gastos/conceptos', {
        params: { q: form.concepto }
      })
    } catch { sugerencias.value = [] }
  }, 300)
}

function seleccionarSugerencia(s) {
  form.concepto = s.concepto
  if (s.categoriaId && !form.categoriaId) {
    form.categoriaId = s.categoriaId
  }
  sugerencias.value = []
  mostrarSugerencias.value = false
}

function ocultarSugerencias() {
  setTimeout(() => { mostrarSugerencias.value = false }, 200)
}

async function guardar() {
  errorMsg.value = ''

  if (!form.concepto?.trim()) {
    errorMsg.value = 'El concepto es obligatorio'
    return
  }
  if (!form.monto || form.monto <= 0) {
    errorMsg.value = 'Ingresa un monto válido'
    return
  }
  if (!form.categoriaId) {
    errorMsg.value = 'Selecciona una categoría'
    return
  }

  saving.value = true
  try {
    if (editando.value) {
      await updateGasto(props.gastoEditar.id, {
        concepto: form.concepto.trim(),
        monto: parseFloat(form.monto),
        categoriaId: form.categoriaId,
        fecha: form.fecha,
        hora: form.hora,
        notas: form.notas?.trim() || null,
      })
    } else {
      await createGasto({
        concepto: form.concepto.trim(),
        monto: parseFloat(form.monto),
        categoriaId: form.categoriaId,
        fecha: form.fecha,
        hora: form.hora,
        metodoRegistro: 'manual',
        notas: form.notas?.trim() || null,
      })
    }
    emit('saved')
    emit('close')
  } catch (e) {
    errorMsg.value = 'Error al guardar el gasto'
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
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
