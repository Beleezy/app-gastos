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
        <h2 class="text-lg font-semibold text-white">Nueva deuda</h2>
        <button class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-gray-400" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="px-5 pb-8 space-y-4">
        <!-- Tipo deuda toggle -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Tipo</label>
          <div class="flex bg-primary-900/50 rounded-xl p-1">
            <button
              class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              :class="form.tipoDeuda === 'me_deben' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500'"
              @click="form.tipoDeuda = 'me_deben'"
            >
              Me debe
            </button>
            <button
              class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              :class="form.tipoDeuda === 'yo_debo' ? 'bg-red-500/20 text-red-400' : 'text-gray-500'"
              @click="form.tipoDeuda = 'yo_debo'"
            >
              Yo debo
            </button>
          </div>
        </div>

        <!-- Persona (autocomplete or new) -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Persona / Entidad</label>
          <div class="relative">
            <input
              v-model="form.personaNombre"
              type="text"
              placeholder="Nombre de la persona u organizacion..."
              class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              @input="onPersonaInput"
              @focus="showSugerencias = true"
            />
            <!-- Suggestions dropdown -->
            <div
              v-if="showSugerencias && sugerencias.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-primary-800 border border-primary-700/50 rounded-xl overflow-hidden z-10 shadow-xl"
            >
              <button
                v-for="s in sugerencias"
                :key="s.id"
                class="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-primary-700/50 transition-colors flex items-center gap-2"
                @click="seleccionarSugerencia(s)"
              >
                <div class="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center text-xs font-medium text-gray-400">
                  {{ s.nombre.charAt(0).toUpperCase() }}
                </div>
                <span>{{ s.nombre }}</span>
                <span v-if="s.tipo === 'organizacion'" class="text-[9px] bg-primary-600 px-1 py-0.5 rounded text-gray-400">ORG</span>
              </button>
            </div>
          </div>
          <!-- Tipo persona/org toggle -->
          <div v-if="!form.personaEntidadId" class="flex items-center gap-3 mt-2">
            <button
              class="px-3 py-1 rounded-lg text-xs transition-colors"
              :class="form.personaTipo === 'persona' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary-900/50 text-gray-500'"
              @click="form.personaTipo = 'persona'"
            >
              Persona
            </button>
            <button
              class="px-3 py-1 rounded-lg text-xs transition-colors"
              :class="form.personaTipo === 'organizacion' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary-900/50 text-gray-500'"
              @click="form.personaTipo = 'organizacion'"
            >
              Organizacion
            </button>
          </div>
        </div>

        <!-- Concepto -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Concepto</label>
          <input
            v-model="form.concepto"
            type="text"
            placeholder="Ej: Almuerzo del martes, Prestamo..."
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
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
              placeholder="0.00"
              class="w-full pl-9 pr-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <!-- Fecha -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Fecha</label>
          <input
            v-model="form.fecha"
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
          <p class="text-[10px] text-gray-600 mt-1">Fecha acordada para el pago (si la hay)</p>
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
          {{ saving ? 'Guardando...' : 'Agregar deuda' }}
        </button>
      </div>
    </div>
  </div>
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
  fecha: new Date().toISOString().split('T')[0],
  fechaPago: '',
  notas: '',
})

const saving = ref(false)
const errorMsg = ref('')
const showSugerencias = ref(false)

// All personas for autocomplete (fetch all, not filtered by type)
const todasPersonas = ref([])
onMounted(async () => {
  try {
    todasPersonas.value = await $fetch('/api/deudas/personas')
  } catch {}
})

const sugerencias = computed(() => {
  if (!form.personaNombre?.trim() || form.personaEntidadId) return []
  const query = form.personaNombre.toLowerCase()
  return todasPersonas.value.filter(p =>
    p.nombre.toLowerCase().includes(query)
  ).slice(0, 5)
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
    errorMsg.value = 'Error al guardar la deuda'
  } finally {
    saving.value = false
  }
}

// Close suggestions on outside click
function handleClickOutside(e) {
  showSugerencias.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
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
