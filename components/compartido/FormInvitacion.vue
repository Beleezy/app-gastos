<template>
  <SharedBaseBottomSheet title="Compartir mis gastos" @close="$emit('close')">
    <p class="text-sm text-theme-text-muted mb-4">
      La otra persona podrá ver en qué estás gastando para avisarte a tiempo.
      <strong class="text-theme-text">No verá tu cuenta ni podrá editar nada.</strong>
    </p>

    <div class="space-y-4">
      <div>
        <label for="compartido-email" class="block text-sm font-medium text-theme-text-muted mb-1.5"
          >Email de la persona</label
        >
        <input
          id="compartido-email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="correo@ejemplo.com"
          data-testid="compartido-email"
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>

      <CompartidoSelectorCategorias v-model="categorias" :categorias="listaCategorias" />

      <fieldset>
        <legend class="block text-sm font-medium text-theme-text-muted mb-1.5">
          Cuánto detalle verá
        </legend>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="op in NIVELES"
            :key="op.valor"
            type="button"
            class="tap-target text-left px-3 py-2.5 rounded-xl border transition-colors"
            :class="
              nivelDetalle === op.valor
                ? 'bg-theme-accent-bg border-theme-accent'
                : 'bg-theme-input border-theme-border hover:border-theme-accent'
            "
            :aria-pressed="nivelDetalle === op.valor"
            @click="nivelDetalle = op.valor"
          >
            <span
              class="block text-sm font-semibold"
              :class="nivelDetalle === op.valor ? 'text-theme-accent' : 'text-theme-text'"
              >{{ op.titulo }}</span
            >
            <span class="block text-[0.6875rem] text-theme-text-muted mt-0.5">{{ op.ayuda }}</span>
          </button>
        </div>
      </fieldset>

      <div>
        <label
          for="compartido-mensaje"
          class="block text-sm font-medium text-theme-text-muted mb-1.5"
          >Mensaje (opcional)</label
        >
        <textarea
          id="compartido-mensaje"
          v-model="mensaje"
          rows="2"
          placeholder="Ej: para que me frenes si me paso con la comida"
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
        />
      </div>

      <p v-if="errorLocal" class="text-red-400 text-xs" role="alert">{{ errorLocal }}</p>
    </div>

    <template #footer>
      <button
        type="button"
        class="tap-target w-full py-3 rounded-xl bg-theme-accent text-theme-on-accent font-semibold text-sm disabled:opacity-50 transition-opacity"
        :disabled="enviando || !email"
        data-testid="compartido-enviar-invitacion"
        @click="enviar"
      >
        {{ enviando ? 'Enviando…' : 'Enviar invitación' }}
      </button>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const emit = defineEmits(['close', 'enviada'])

const NIVELES = [
  { valor: 'resumen', titulo: 'Resumen', ayuda: 'Totales por rubro y cómo van' },
  { valor: 'detalle', titulo: 'Detalle', ayuda: 'Además, cada gasto uno por uno' },
]

const { invitar } = useCompartido()
const { categorias: listaCategorias, fetchCategorias } = useCategorias()
const toast = useToast()

const email = ref('')
const mensaje = ref('')
const nivelDetalle = ref('resumen')
const categorias = ref([])
const enviando = ref(false)
const errorLocal = ref('')

onMounted(() => fetchCategorias())

async function enviar() {
  errorLocal.value = ''
  enviando.value = true
  try {
    await invitar({
      email: email.value.trim(),
      mensaje: mensaje.value.trim() || null,
      nivelDetalle: nivelDetalle.value,
      categorias: categorias.value,
    })
    toast.success('Invitación enviada')
    emit('enviada')
    emit('close')
  } catch (e) {
    errorLocal.value = e?.data?.message || e?.message || 'No se pudo enviar la invitación'
  } finally {
    enviando.value = false
  }
}
</script>
