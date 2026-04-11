<template>
  <SharedBaseBottomSheet :title="modoEdicion ? 'Editar gasto planificado' : 'Nuevo gasto planificado'" @close="$emit('close')">
    <!-- Concepto -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Concepto</label>
      <input
        v-model="form.concepto"
        type="text"
        placeholder="Ej: Recibo de luz, Cuota gimnasio..."
        class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <!-- Categoría -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Categoría</label>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="cat in categorias"
          :key="cat.id"
          class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all"
          :class="form.categoriaId === cat.id
            ? 'border-theme-accent bg-theme-accent-bg'
            : 'border-primary-700/30 bg-primary-900/50'"
          @click="form.categoriaId = cat.id"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: (cat.color || '#6b7280') + '26' }"
          >
            <span class="text-sm">{{ getEmoji(cat.nombre) }}</span>
          </div>
          <span class="text-[10px] text-gray-400 text-center leading-tight truncate w-full">{{ cat.nombre }}</span>
        </button>
      </div>
    </div>

    <!-- Monto -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Monto estimado</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{{ currencySymbol }}</span>
        <input
          v-model="form.montoEstimado"
          type="number"
          step="0.01"
          placeholder="0.00"
          class="w-full pl-9 pr-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
    </div>

    <!-- Fecha de pago - Day picker -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">
        Fecha de pago <span class="text-gray-600">({{ nombreMes }} {{ anioActual }})</span>
      </label>
      <div class="bg-primary-900/50 rounded-xl p-3 border border-primary-700/30">
        <div class="grid grid-cols-7 gap-1.5">
          <span v-for="d in ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']" :key="d" class="text-center text-[10px] text-gray-600 font-medium pb-1">
            {{ d }}
          </span>
          <span v-for="i in primerDiaOffset" :key="'empty-' + i"></span>
          <button
            v-for="dia in totalDias"
            :key="dia"
            class="w-9 h-9 rounded-lg text-xs font-medium flex items-center justify-center transition-all"
            :class="form.diaSeleccionado === dia
              ? 'bg-theme-accent text-white'
              : esPasado(dia)
                ? 'text-gray-700'
                : 'text-gray-300 hover:bg-primary-700'"
            @click="form.diaSeleccionado = dia"
          >
            {{ dia }}
          </button>
        </div>
      </div>
    </div>

    <!-- Recurrente toggle -->
    <div class="flex items-center justify-between py-2">
      <div>
        <p class="text-sm font-medium text-white">Gasto recurrente</p>
        <p class="text-xs text-gray-500">Se repetirá cada mes automáticamente</p>
      </div>
      <button
        class="w-11 h-6 rounded-full relative transition-colors"
        :class="form.esRecurrente ? 'bg-theme-accent' : 'bg-primary-700'"
        @click="form.esRecurrente = !form.esRecurrente"
      >
        <div
          class="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
          :class="form.esRecurrente ? 'translate-x-[22px] bg-white' : 'translate-x-0.5 bg-gray-400'"
        ></div>
      </button>
    </div>

    <!-- Notas -->
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1.5">Notas <span class="text-gray-600">(opcional)</span></label>
      <textarea
        v-model="form.notas"
        rows="2"
        placeholder="Agregar notas o detalles..."
        class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
      ></textarea>
    </div>

    <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

    <button
      class="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
      :class="saving ? 'bg-[var(--color-accent)]/70 cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'"
      :disabled="saving"
      @click="guardar"
    >
      <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      {{ saving ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Agregar gasto planificado' }}
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  gastoEditar: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const { categorias, createGastoPlaneado, updateGastoPlaneado, mesActual, anioActual, nombreMes, diasEnMes } = usePlanificador()

const modoEdicion = computed(() => !!props.gastoEditar)

const totalDias = computed(() => diasEnMes())
const primerDiaOffset = computed(() => {
  const d = new Date(anioActual.value, mesActual.value - 1, 1)
  return d.getDay() === 0 ? 6 : d.getDay() - 1
})

const hoy = new Date()

function getDiaInicial() {
  if (props.gastoEditar?.fechaProbablePago) {
    return new Date(props.gastoEditar.fechaProbablePago + 'T00:00:00').getDate()
  }
  return (mesActual.value === hoy.getMonth() + 1 && anioActual.value === hoy.getFullYear()) ? hoy.getDate() : 1
}

const form = reactive({
  concepto: props.gastoEditar?.concepto || '',
  categoriaId: props.gastoEditar?.categoriaId || null,
  montoEstimado: props.gastoEditar?.montoEstimado || null,
  diaSeleccionado: getDiaInicial(),
  esRecurrente: props.gastoEditar?.esRecurrente || false,
  notas: props.gastoEditar?.notas || '',
})

const saving = ref(false)
const errorMsg = ref('')

const { currencySymbol } = useCurrency()
const { success: toastSuccess } = useToast()
const { getCategoriaIcono } = useCategorias()

function getEmoji(nombre) {
  return getCategoriaIcono(nombre)
}

function esPasado(dia) {
  if (anioActual.value < hoy.getFullYear()) return true
  if (anioActual.value === hoy.getFullYear() && mesActual.value < hoy.getMonth() + 1) return true
  if (anioActual.value === hoy.getFullYear() && mesActual.value === hoy.getMonth() + 1 && dia < hoy.getDate()) return true
  return false
}

async function guardar() {
  errorMsg.value = ''
  if (!form.concepto.trim()) {
    errorMsg.value = 'El concepto es obligatorio'
    return
  }
  if (!form.categoriaId) {
    errorMsg.value = 'Selecciona una categoría'
    return
  }
  if (!form.montoEstimado || form.montoEstimado <= 0) {
    errorMsg.value = 'Ingresa un monto válido'
    return
  }

  const mes = String(mesActual.value).padStart(2, '0')
  const dia = String(form.diaSeleccionado).padStart(2, '0')
  const fecha = `${anioActual.value}-${mes}-${dia}`

  saving.value = true
  try {
    const data = {
      categoriaId: form.categoriaId,
      concepto: form.concepto.trim(),
      montoEstimado: parseFloat(form.montoEstimado),
      fechaProbablePago: fecha,
      esRecurrente: form.esRecurrente,
      notas: form.notas.trim() || null,
    }

    if (modoEdicion.value) {
      await updateGastoPlaneado(props.gastoEditar.id, data)
      toastSuccess('Gasto actualizado correctamente')
    } else {
      await createGastoPlaneado(data)
      toastSuccess('Gasto planificado agregado')
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
