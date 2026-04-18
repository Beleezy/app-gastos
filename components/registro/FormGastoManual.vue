<template>
  <SharedBaseBottomSheet :title="editando ? 'Editar gasto' : (duplicando ? 'Copiar gasto' : 'Nuevo gasto')" @close="$emit('close')">
    <!-- Concepto con autocompletado -->
    <div class="relative">
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Concepto</label>
      <input
        v-model="form.concepto"
        type="text"
        placeholder="Ej: Almuerzo, Pasaje, Recibo de luz..."
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        @input="buscarConceptos"
        @focus="mostrarSugerencias = true"
        @blur="ocultarSugerencias"
        autocomplete="off"
      />
      <div
        v-if="mostrarSugerencias && sugerencias.length > 0 && form.concepto.length >= 2"
        class="absolute z-10 w-full mt-1 bg-theme-card border border-theme-border rounded-xl overflow-hidden shadow-lg"
      >
        <button
          v-for="(s, i) in sugerencias"
          :key="i"
          class="w-full px-4 py-2.5 text-left text-sm text-theme-text-sec hover:bg-theme-border-md flex items-center justify-between transition-colors"
          @mousedown.prevent="seleccionarSugerencia(s)"
        >
          <span>{{ s.concepto }}</span>
          <span class="text-xs text-theme-text-sec">{{ s.count }}x</span>
        </button>
      </div>
    </div>

    <!-- Monto -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Monto</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-text-sec">{{ currencySymbol }}</span>
        <input
          v-model="form.monto"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full pl-9 pr-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
    </div>

    <!-- Categoría -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Categoría</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="cat in categorias"
          :key="cat.id"
          class="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs transition-all"
          :class="form.categoriaId === cat.id
            ? 'border-theme-accent bg-theme-accent-bg'
            : 'border-theme-border bg-theme-input hover:border-primary-600'"
          @click="form.categoriaId = cat.id"
        >
          <span class="text-base">{{ cat.icono || '📦' }}</span>
          <span class="truncate w-full text-center"
            :class="form.categoriaId === cat.id ? 'text-theme-accent' : 'text-theme-text-muted'"
          >{{ cat.nombre }}</span>
        </button>
      </div>
    </div>

    <!-- Fecha y Hora -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Fecha</label>
        <input
          v-model="form.fecha"
          type="date"
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Hora</label>
        <input
          v-model="form.hora"
          type="time"
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
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

    <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

    <button
      class="w-full py-3.5 rounded-xl text-theme-on-accent font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
      :class="saving ? 'bg-theme-accent cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'"
      :disabled="saving"
      @click="guardar"
    >
      <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      {{ saving ? 'Guardando...' : (editando ? 'Actualizar gasto' : (duplicando ? 'Registrar copia' : 'Registrar gasto')) }}
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  categorias: { type: Array, default: () => [] },
  gastoEditar: { type: Object, default: null },
  gastoDuplicar: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const editando = computed(() => !!props.gastoEditar)
const duplicando = computed(() => !props.gastoEditar && !!props.gastoDuplicar)

const { fechaHoy, horaActual } = useFechaPeru()

const form = reactive({
  concepto: props.gastoEditar?.concepto || props.gastoDuplicar?.concepto || '',
  monto: props.gastoEditar?.monto || props.gastoDuplicar?.monto || null,
  categoriaId: props.gastoEditar?.categoriaId || props.gastoDuplicar?.categoriaId || null,
  fecha: props.gastoEditar?.fecha || fechaHoy(),
  hora: props.gastoEditar?.hora?.substring(0, 5) || horaActual(),
  notas: props.gastoEditar?.notas || props.gastoDuplicar?.notas || '',
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
  const fechaIngresada = new Date(form.fecha + 'T00:00:00')
  const limiteFuturo = new Date()
  limiteFuturo.setDate(limiteFuturo.getDate() + 30)
  if (fechaIngresada > limiteFuturo) {
    errorMsg.value = 'La fecha no puede ser más de 30 días en el futuro'
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
    useToast().error(handleApiError(e))
  } finally {
    saving.value = false
  }
}
</script>
