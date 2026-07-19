<template>
  <SharedBaseBottomSheet title="Nueva deuda" @close="$emit('close')">
    <!-- Tipo deuda toggle -->
    <div>
      <label class="block text-sm font-medium text-theme-text-muted mb-1.5">Tipo</label>
      <div class="flex bg-theme-input rounded-xl p-1">
        <button
          class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
          :class="
            form.tipoDeuda === 'me_deben'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-theme-text-sec'
          "
          @click="form.tipoDeuda = 'me_deben'"
        >
          Me debe
        </button>
        <button
          class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
          :class="
            form.tipoDeuda === 'yo_debo' ? 'bg-red-500/20 text-red-400' : 'text-theme-text-sec'
          "
          @click="form.tipoDeuda = 'yo_debo'"
        >
          Yo debo
        </button>
      </div>
    </div>

    <!-- Persona (autocomplete or new) -->
    <div>
      <label for="fd-2" class="block text-sm font-medium text-theme-text-muted mb-1.5"
        >Persona / Entidad</label
      >
      <div class="relative">
        <input
          id="fd-2"
          v-model="form.personaNombre"
          type="text"
          placeholder="Nombre de la persona u organizacion..."
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
          data-testid="input-persona"
          @input="onPersonaInput"
          @focus="showSugerencias = true"
        />
        <div
          v-if="showSugerencias && sugerencias.length > 0"
          class="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-theme-border rounded-xl overflow-hidden z-10 shadow-xl"
        >
          <button
            v-for="s in sugerencias"
            :key="s.id"
            class="w-full px-4 py-2.5 text-left text-sm text-theme-text-sec hover:bg-theme-border-md transition-colors flex items-center gap-2"
            @click="seleccionarSugerencia(s)"
          >
            <div
              class="w-7 h-7 rounded-full bg-theme-border-md flex items-center justify-center text-xs font-medium text-theme-text-muted"
            >
              {{ s.nombre.charAt(0).toUpperCase() }}
            </div>
            <span>{{ s.nombre }}</span>
            <span
              v-if="s.tipo === 'organizacion'"
              class="text-[0.6875rem] bg-primary-600 px-1 py-0.5 rounded text-theme-text-muted"
              >ORG</span
            >
          </button>
        </div>
      </div>
      <div v-if="!form.personaEntidadId" class="flex items-center gap-3 mt-2">
        <button
          class="px-3 py-1 rounded-lg text-xs transition-colors"
          :class="
            form.personaTipo === 'persona'
              ? 'bg-theme-accent-bg text-theme-accent'
              : 'bg-theme-input text-theme-text-sec'
          "
          @click="form.personaTipo = 'persona'"
        >
          Persona
        </button>
        <button
          class="px-3 py-1 rounded-lg text-xs transition-colors"
          :class="
            form.personaTipo === 'organizacion'
              ? 'bg-theme-accent-bg text-theme-accent'
              : 'bg-theme-input text-theme-text-sec'
          "
          @click="form.personaTipo = 'organizacion'"
        >
          Organizacion
        </button>
      </div>
    </div>

    <!-- Concepto -->
    <div>
      <label for="fd-3" class="block text-sm font-medium text-theme-text-muted mb-1.5"
        >Concepto</label
      >
      <input
        id="fd-3"
        v-model="form.concepto"
        type="text"
        placeholder="Ej: Almuerzo del martes, Prestamo..."
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        data-testid="input-concepto"
      />
    </div>

    <!-- Monto -->
    <div>
      <label for="fd-4" class="block text-sm font-medium text-theme-text-muted mb-1.5">Monto</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-text-sec">{{
          currencySymbol
        }}</span>
        <input
          id="fd-4"
          v-model="form.monto"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full pl-9 pr-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
          data-testid="input-monto"
        />
      </div>
    </div>

    <!-- Fecha -->
    <div>
      <label for="fd-5" class="block text-sm font-medium text-theme-text-muted mb-1.5">Fecha</label>
      <input
        id="fd-5"
        v-model="form.fecha"
        type="date"
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        data-testid="input-fecha"
      />
    </div>

    <!-- Fecha de pago -->
    <div>
      <label for="fd-6" class="block text-sm font-medium text-theme-text-muted mb-1.5"
        >Fecha de pago <span class="text-theme-text-muted">(opcional)</span></label
      >
      <input
        id="fd-6"
        v-model="form.fechaPago"
        type="date"
        class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
      />
      <p class="text-[0.6875rem] text-theme-text-muted mt-1">
        Fecha acordada para el pago (si la hay)
      </p>
    </div>

    <!-- Notas -->
    <div>
      <label for="fd-7" class="block text-sm font-medium text-theme-text-muted mb-1.5"
        >Notas <span class="text-theme-text-muted">(opcional)</span></label
      >
      <textarea
        id="fd-7"
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
        :class="
          saving
            ? 'bg-theme-accent cursor-not-allowed'
            : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark'
        "
        :disabled="saving"
        data-testid="btn-guardar-deuda"
        @click="guardar"
      >
        <svg
          v-if="saving"
          class="animate-spin w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        {{ saving ? 'Guardando...' : 'Agregar deuda' }}
      </button>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  personaPredefinida: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const { currencySymbol } = useCurrency()
const { createDeuda, personas, tabActual } = useDeudas()

const form = reactive({
  tipoDeuda: props.personaPredefinida ? tabActual.value : 'me_deben',
  personaNombre: props.personaPredefinida?.nombre || '',
  personaEntidadId: props.personaPredefinida?.id || null,
  personaTipo: 'persona',
  concepto: '',
  monto: null,
  fecha: useFechaPeru().fechaHoy(),
  fechaPago: '',
  notas: '',
})

const saving = ref(false)
const errorMsg = ref('')
const showSugerencias = ref(false)

const todasPersonas = ref([])
onMounted(async () => {
  try {
    todasPersonas.value = await $fetch('/api/deudas/personas')
  } catch {}
})

const sugerencias = computed(() => {
  if (!form.personaNombre?.trim() || form.personaEntidadId) return []
  const query = form.personaNombre.toLowerCase()
  return todasPersonas.value.filter((p) => p.nombre.toLowerCase().includes(query)).slice(0, 5)
})

function onPersonaInput() {
  form.personaEntidadId = null
  showSugerencias.value = true
}

function seleccionarSugerencia(persona) {
  form.personaNombre = persona.nombre
  form.personaEntidadId = persona.id
  form.personaTipo = persona.tipo
  showSugerencias.value = false
}

async function guardar() {
  errorMsg.value = ''

  if (!form.personaNombre?.trim()) {
    errorMsg.value = 'Ingresa el nombre de la persona'
    return
  }
  if (!form.concepto?.trim()) {
    errorMsg.value = 'El concepto es obligatorio'
    return
  }
  if (!form.monto || form.monto <= 0) {
    errorMsg.value = 'Ingresa un monto valido'
    return
  }

  saving.value = true
  try {
    await createDeuda({
      tipoDeuda: form.tipoDeuda,
      personaEntidadId: form.personaEntidadId,
      personaNombre: form.personaNombre.trim(),
      personaTipo: form.personaTipo,
      concepto: form.concepto.trim(),
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      fechaPago: form.fechaPago || null,
      notas: form.notas?.trim() || null,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    // Mensaje inline en el modal además del toast: el toast puede quedar
    // tapado por el bottom-sheet y el guardado fallido parecía silencioso.
    errorMsg.value = handleApiError(e)
    useToast().error(errorMsg.value)
  } finally {
    saving.value = false
  }
}

function handleClickOutside(e) {
  showSugerencias.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
