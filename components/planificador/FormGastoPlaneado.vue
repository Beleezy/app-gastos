<template>
  <SharedBaseBottomSheet :title="modoEdicion ? 'Editar gasto planificado' : 'Nuevo gasto planificado'" @close="$emit('close')">
    <!-- Badge recurrente en edición -->
    <div v-if="modoEdicion && gastoEditar?.esRecurrente" class="flex items-start gap-2 rounded-xl border border-theme-accent/30 bg-theme-accent-bg px-3 py-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <div class="text-[11px] text-theme-accent leading-tight">
        Gasto recurrente. Al guardar elegirás si los cambios se aplican solo a este mes o también a los meses futuros.
      </div>
    </div>

    <!-- Concepto -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Concepto</label>
      <input
        v-model="form.concepto"
        type="text"
        placeholder="Ej: Recibo de luz, Cuota gimnasio..."
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
    </div>

    <!-- Categoría -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Categoría</label>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="cat in categorias"
          :key="cat.id"
          class="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all"
          :class="form.categoriaId === cat.id
            ? 'border-theme-accent bg-theme-accent-bg'
            : 'border-theme-border bg-theme-input'"
          @click="form.categoriaId = cat.id"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: (cat.color || '#6b7280') + '26' }"
          >
            <span class="text-sm">{{ getEmoji(cat.nombre) }}</span>
          </div>
          <span class="text-[10px] text-theme-text-muted text-center leading-tight truncate w-full">{{ cat.nombre }}</span>
        </button>
      </div>
    </div>

    <!-- Monto -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Monto estimado</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-text-sec">{{ currencySymbol }}</span>
        <input
          v-model="form.montoEstimado"
          type="number"
          step="0.01"
          placeholder="0.00"
          class="w-full pl-9 pr-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
    </div>

    <!-- Fecha de pago - Day picker -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">
        Fecha de pago <span class="text-theme-text-muted">({{ nombreMes }} {{ anioActual }})</span>
      </label>
      <div class="bg-theme-input rounded-xl p-3 border border-theme-border">
        <div class="grid grid-cols-7 gap-1.5">
          <span v-for="d in ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']" :key="d" class="text-center text-[10px] text-theme-text-muted font-medium pb-1">
            {{ d }}
          </span>
          <span v-for="i in primerDiaOffset" :key="'empty-' + i"></span>
          <button
            v-for="dia in totalDias"
            :key="dia"
            class="w-9 h-9 rounded-lg text-xs font-medium flex items-center justify-center transition-all"
            :class="form.diaSeleccionado === dia
              ? 'bg-theme-accent text-theme-text'
              : esPasado(dia)
                ? 'text-theme-text-muted'
                : 'text-theme-text-sec hover:bg-theme-border-md'"
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
        <p class="text-sm font-medium text-theme-text">Gasto recurrente</p>
        <p class="text-xs text-theme-text-sec">Se repetirá cada mes automáticamente</p>
      </div>
      <button
        class="w-11 h-6 rounded-full relative transition-colors"
        :class="form.esRecurrente ? 'bg-theme-accent' : 'bg-theme-border-md'"
        @click="form.esRecurrente = !form.esRecurrente"
      >
        <div
          class="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
          :class="form.esRecurrente ? 'translate-x-[22px] bg-theme-card' : 'translate-x-0.5 bg-gray-400'"
        ></div>
      </button>
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
      class="w-full py-3.5 rounded-xl text-theme-text font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
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

    <!-- Modal: alcance de la edición para recurrentes -->
    <div v-if="mostrarAlcance" class="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="mostrarAlcance = false"></div>
      <div class="relative w-full max-w-sm rounded-2xl border border-theme-border bg-theme-card p-5">
        <h3 class="mb-1 text-base font-semibold text-theme-text">Gasto recurrente</h3>
        <p class="mb-5 text-sm text-theme-text-muted">¿Dónde quieres aplicar los cambios?</p>
        <div class="space-y-2">
          <button
            class="w-full rounded-xl bg-theme-accent-bg px-3 py-2.5 text-sm font-medium text-theme-accent transition-colors hover:bg-theme-accent-bg-hover"
            :disabled="saving"
            @click="confirmarGuardar('solo')"
          >
            Solo este mes
            <span class="block text-[10px] text-theme-text-muted mt-0.5">Este registro se desvincula y no afecta los futuros</span>
          </button>
          <button
            class="w-full rounded-xl bg-theme-accent px-3 py-2.5 text-sm font-medium text-theme-text transition-colors hover:bg-theme-accent-dark"
            :disabled="saving"
            @click="confirmarGuardar('futuros')"
          >
            Este y los meses futuros
            <span class="block text-[10px] text-white/70 mt-0.5">Propaga los cambios a todas las instancias del grupo</span>
          </button>
          <button
            class="w-full rounded-xl py-2 text-sm text-theme-text-sec transition-colors hover:text-theme-text"
            :disabled="saving"
            @click="mostrarAlcance = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
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
const mostrarAlcance = ref(false)

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

function validar() {
  if (!form.concepto.trim()) { errorMsg.value = 'El concepto es obligatorio'; return false }
  if (!form.categoriaId) { errorMsg.value = 'Selecciona una categoría'; return false }
  if (!form.montoEstimado || form.montoEstimado <= 0) { errorMsg.value = 'Ingresa un monto válido'; return false }
  return true
}

function buildPayload() {
  const mes = String(mesActual.value).padStart(2, '0')
  const dia = String(form.diaSeleccionado).padStart(2, '0')
  const fecha = `${anioActual.value}-${mes}-${dia}`
  return {
    categoriaId: form.categoriaId,
    concepto: form.concepto.trim(),
    montoEstimado: parseFloat(form.montoEstimado),
    fechaProbablePago: fecha,
    esRecurrente: form.esRecurrente,
    notas: form.notas.trim() || null,
  }
}

async function guardar() {
  errorMsg.value = ''
  if (!validar()) return

  // Edición de recurrente: pedir alcance antes de guardar
  if (modoEdicion.value && props.gastoEditar?.esRecurrente && form.esRecurrente) {
    mostrarAlcance.value = true
    return
  }

  await ejecutarGuardado()
}

async function confirmarGuardar(alcance) {
  mostrarAlcance.value = false
  await ejecutarGuardado(alcance)
}

async function ejecutarGuardado(alcanceEdicion = null) {
  saving.value = true
  try {
    const data = buildPayload()
    if (modoEdicion.value) {
      if (alcanceEdicion) data.alcanceEdicion = alcanceEdicion
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
