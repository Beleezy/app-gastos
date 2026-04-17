<template>
  <SharedBaseBottomSheet title="Gestionar medios de ahorro" @close="$emit('close')">
    <!-- Lista de medios existentes -->
    <div class="space-y-2 mb-4">
      <div
        v-for="medio in medios"
        :key="medio.id"
        class="flex items-center gap-3 rounded-xl bg-theme-input border border-theme-border p-3"
      >
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          :style="{ backgroundColor: (medio.color || '#6b7280') + '26' }"
        >
          <span class="text-sm">{{ medio.icono || '💰' }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-theme-text truncate">{{ medio.nombre }}</p>
          <p class="text-[10px] text-theme-text-sec">{{ medio.tipo || 'otro' }}</p>
        </div>
        <button
          class="w-7 h-7 flex items-center justify-center rounded-lg text-theme-text-sec hover:text-red-400 transition-colors"
          @click="eliminar(medio)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Agregar nuevo -->
    <div class="border-t border-theme-border pt-4">
      <h4 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-3">Agregar nuevo medio</h4>

      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Nombre</label>
          <input
            v-model="nuevoNombre"
            type="text"
            placeholder="Ej: BCP Ahorros, Interbank..."
            class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Tipo</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in tipos"
              :key="t.value"
              class="px-3 py-2 rounded-xl border text-xs font-medium transition-all"
              :class="nuevoTipo === t.value ? 'border-theme-accent bg-theme-accent-bg text-theme-accent' : 'border-theme-border bg-theme-input text-theme-text-sec'"
              @click="nuevoTipo = t.value"
            >
              {{ t.icono }} {{ t.label }}
            </button>
          </div>
        </div>

        <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

        <button
          class="w-full py-3 rounded-xl bg-theme-accent text-white font-semibold text-sm transition-colors hover:bg-theme-accent-dark"
          :disabled="saving"
          @click="agregar"
        >
          {{ saving ? 'Guardando...' : 'Agregar medio' }}
        </button>
      </div>
    </div>
  </SharedBaseBottomSheet>
</template>

<script setup>
const emit = defineEmits(['close'])

const { medios, createMedio, deleteMedio } = useAhorros()
const { success, error: toastError } = useToast()

const tipos = [
  { value: 'billetera_digital', label: 'Billetera digital', icono: '📱' },
  { value: 'cuenta_bancaria', label: 'Cuenta bancaria', icono: '🏦' },
  { value: 'efectivo', label: 'Efectivo', icono: '💵' },
  { value: 'otro', label: 'Otro', icono: '💰' },
]

const nuevoNombre = ref('')
const nuevoTipo = ref('billetera_digital')
const saving = ref(false)
const errorMsg = ref('')

const iconoPorTipo = {
  billetera_digital: '📱',
  cuenta_bancaria: '🏦',
  efectivo: '💵',
  otro: '💰',
}

const colorPorTipo = {
  billetera_digital: '#7C3AED',
  cuenta_bancaria: '#2563EB',
  efectivo: '#16A34A',
  otro: '#6B7280',
}

async function agregar() {
  errorMsg.value = ''
  if (!nuevoNombre.value.trim()) {
    errorMsg.value = 'El nombre es obligatorio'
    return
  }

  saving.value = true
  try {
    await createMedio({
      nombre: nuevoNombre.value.trim(),
      tipo: nuevoTipo.value,
      icono: iconoPorTipo[nuevoTipo.value] || '💰',
      color: colorPorTipo[nuevoTipo.value] || '#6B7280',
    })
    nuevoNombre.value = ''
    success('Medio agregado')
  } catch (e) {
    errorMsg.value = 'Error al agregar medio'
  } finally {
    saving.value = false
  }
}

async function eliminar(medio) {
  try {
    await deleteMedio(medio.id)
    success('Medio eliminado')
  } catch (e) {
    toastError('Error al eliminar medio')
  }
}
</script>
