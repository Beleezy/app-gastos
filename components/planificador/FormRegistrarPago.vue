<template>
  <SharedBaseBottomSheet :title="gasto.gastoRegistradoId ? 'Editar registro de gasto' : 'Registrar pago'" @close="$emit('close')">
    <!-- Concepto a todo el ancho: en dos columnas el texto largo se apretaba
         a la izquierda dejando la derecha vacía con texto grande -->
    <div class="rounded-2xl border border-theme-border bg-theme-input p-4">
      <p class="text-sm font-semibold text-theme-text leading-snug break-words">{{ gasto.concepto }}</p>
      <div class="mt-1.5 flex items-center justify-between gap-3">
        <p class="min-w-0 truncate text-xs text-theme-text-sec">
          {{ gasto.categoriaNombre || 'Sin categoria' }} · {{ formatFecha(gasto.fechaProbablePago) }}
        </p>
        <p class="shrink-0 text-sm font-semibold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(gasto.montoEstimado) }}</p>
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Fecha de pago</label>
      <input
        v-model="form.fechaPago"
        type="date"
        class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text focus:border-theme-accent focus:outline-none focus:ring-1 focus:ring-theme-accent transition-colors"
        data-testid="input-fecha-pago"
      />
    </div>

    <!-- Medio de ahorro (si categoría = Ahorro) -->
    <div v-if="esCategoriaAhorro">
      <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Medio de ahorro</label>
      <div v-if="mediosLoading" class="text-xs text-theme-text-sec">Cargando medios...</div>
      <div v-else class="grid grid-cols-3 gap-2">
        <button
          v-for="medio in medios"
          :key="medio.id"
          class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all"
          :class="form.medioAhorroId === medio.id
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-theme-border bg-theme-input'"
          @click="form.medioAhorroId = medio.id"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: (medio.color || '#6b7280') + '26' }"
          >
            <span class="text-sm">{{ medio.icono || '💰' }}</span>
          </div>
          <span class="text-[10px] text-theme-text-muted text-center leading-tight line-clamp-2 break-words hyphens-auto w-full">{{ medio.nombre }}</span>
        </button>
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Nota <span class="text-theme-text-muted">(opcional)</span></label>
      <textarea
        v-model="form.notas"
        rows="3"
        placeholder="Ej: pagado por transferencia, cuota completa..."
        class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:border-theme-accent focus:outline-none focus:ring-1 focus:ring-theme-accent transition-colors"
        data-testid="input-notas-pago"
      ></textarea>
    </div>

    <template #footer>
      <p v-if="errorMsg" class="text-xs text-red-400 mb-2">{{ errorMsg }}</p>

      <button
        class="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-theme-on-accent transition-colors"
        :class="saving ? 'bg-theme-accent cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'"
        :disabled="saving"
        data-testid="btn-confirmar-pago"
        @click="guardar"
      >
        <svg v-if="saving" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        {{ saving ? 'Guardando...' : gasto.gastoRegistradoId ? 'Actualizar registro' : 'Registrar en gastos' }}
      </button>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  gasto: { type: Object, required: true },
})

const emit = defineEmits(['close', 'saved'])

const { fechaHoy } = useFechaPeru()
const hoy = fechaHoy()

const form = reactive({
  fechaPago: props.gasto.gastoRegistradoFecha || props.gasto.fechaProbablePago || hoy,
  notas: props.gasto.gastoRegistradoNotas || '',
  medioAhorroId: null,
})

const saving = ref(false)
const errorMsg = ref('')

const { registrarGastoEnRegistro, categorias } = usePlanificador()
const { success, error: toastError } = useToast()
const { currencySymbol, formatMonto } = useCurrency()
const { medios, fetchMedios } = useAhorros()

const esCategoriaAhorro = computed(() => {
  if (!props.gasto.categoriaId) return false
  const cat = categorias.value.find(c => c.id === props.gasto.categoriaId)
  return cat?.nombre?.toLowerCase() === 'ahorro'
})

const mediosLoading = ref(false)

if (esCategoriaAhorro.value) {
  mediosLoading.value = true
  fetchMedios().finally(() => { mediosLoading.value = false })
}

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
    const payload = {
      fechaPago: form.fechaPago,
      notas: form.notas?.trim() || null,
    }
    if (esCategoriaAhorro.value && form.medioAhorroId) {
      payload.medioAhorroId = form.medioAhorroId
    }
    await registrarGastoEnRegistro(props.gasto.id, payload)
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
