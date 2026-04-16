<template>
  <SharedBaseBottomSheet :title="modoEdicion ? 'Editar ahorro' : 'Nuevo ahorro'" @close="$emit('close')">
    <!-- Concepto -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Concepto <span class="text-theme-text-muted">(opcional)</span></label>
      <input
        v-model="form.concepto"
        type="text"
        placeholder="Ej: Ahorro quincenal, meta viaje..."
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
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
          placeholder="0.00"
          class="w-full pl-9 pr-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
    </div>

    <!-- Medio de ahorro -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label class="text-sm font-medium text-theme-text-muted">Medio de ahorro</label>
        <button
          class="text-[10px] text-theme-accent font-medium hover:underline"
          @click="$emit('gestionar-medios')"
        >
          Gestionar medios
        </button>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="medio in medios"
          :key="medio.id"
          class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all"
          :class="form.medioAhorroId === medio.id
            ? 'border-theme-accent bg-theme-accent-bg'
            : 'border-theme-border bg-theme-input'"
          @click="form.medioAhorroId = medio.id"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: (medio.color || '#6b7280') + '26' }"
          >
            <span class="text-sm">{{ medio.icono || '💰' }}</span>
          </div>
          <span class="text-[10px] text-theme-text-muted text-center leading-tight truncate w-full">{{ medio.nombre }}</span>
        </button>
      </div>
    </div>

    <!-- Fecha -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Fecha</label>
      <input
        v-model="form.fecha"
        type="date"
        class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text focus:border-theme-accent focus:outline-none focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <!-- Notas -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Notas <span class="text-theme-text-muted">(opcional)</span></label>
      <textarea
        v-model="form.notas"
        rows="2"
        placeholder="Agregar notas..."
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
      ></textarea>
    </div>

    <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

    <button
      class="w-full py-3.5 rounded-xl text-theme-text font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
      :class="saving ? 'bg-theme-accent cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'"
      :disabled="saving"
      @click="guardar"
    >
      <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      {{ saving ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Registrar ahorro' }}
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  ahorroEditar: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved', 'gestionar-medios'])

const { medios, createAhorro, updateAhorro } = useAhorros()
const { currencySymbol } = useCurrency()
const { success: toastSuccess } = useToast()

const modoEdicion = computed(() => !!props.ahorroEditar)
const hoy = new Date().toISOString().split('T')[0]

const form = reactive({
  concepto: props.ahorroEditar?.concepto || '',
  monto: props.ahorroEditar?.monto || null,
  medioAhorroId: props.ahorroEditar?.medioAhorroId || null,
  fecha: props.ahorroEditar?.fecha || hoy,
  notas: props.ahorroEditar?.notas || '',
})

const saving = ref(false)
const errorMsg = ref('')

async function guardar() {
  errorMsg.value = ''

  if (!form.monto || form.monto <= 0) {
    errorMsg.value = 'Ingresa un monto válido'
    return
  }
  if (!form.fecha) {
    errorMsg.value = 'Selecciona una fecha'
    return
  }

  saving.value = true
  try {
    const data = {
      concepto: form.concepto.trim() || null,
      monto: parseFloat(form.monto),
      medioAhorroId: form.medioAhorroId,
      fecha: form.fecha,
      notas: form.notas.trim() || null,
    }

    if (modoEdicion.value) {
      await updateAhorro(props.ahorroEditar.id, data)
      toastSuccess('Ahorro actualizado')
    } else {
      await createAhorro(data)
      toastSuccess('Ahorro registrado')
    }
    emit('saved')
    emit('close')
  } catch (e) {
    errorMsg.value = 'Error al guardar el ahorro'
  } finally {
    saving.value = false
  }
}
</script>
