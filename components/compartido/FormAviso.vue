<template>
  <SharedBaseBottomSheet title="Enviar aviso" @close="$emit('close')">
    <p class="text-sm text-theme-text-muted mb-3">
      {{ contexto }}
    </p>

    <!-- Plantillas de un tap: en móvil, escribir mata la función -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="plantilla in PLANTILLAS"
        :key="plantilla.texto"
        type="button"
        class="tap-target px-3 py-2 rounded-xl bg-theme-input border border-theme-border text-xs font-medium text-theme-text-sec hover:border-theme-accent transition-colors"
        @click="usarPlantilla(plantilla)"
      >
        {{ plantilla.texto }}
      </button>
    </div>

    <label for="aviso-mensaje" class="block text-sm font-medium text-theme-text-muted mb-1.5"
      >Mensaje</label
    >
    <textarea
      id="aviso-mensaje"
      v-model="mensaje"
      rows="3"
      maxlength="500"
      data-testid="compartido-aviso-mensaje"
      class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
      placeholder="Escribe tu aviso…"
    />
    <p class="text-[0.6875rem] text-theme-text-muted mt-1">{{ mensaje.length }}/500</p>

    <template #footer>
      <button
        type="button"
        class="tap-target w-full py-3 rounded-xl bg-theme-accent text-theme-on-accent font-semibold text-sm disabled:opacity-50"
        :disabled="enviando || !mensaje.trim()"
        data-testid="compartido-enviar-aviso"
        @click="enviar"
      >
        {{ enviando ? 'Enviando…' : 'Enviar' }}
      </button>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  conexion: { type: Object, required: true },
  categoria: { type: Object, default: null },
})
const emit = defineEmits(['close', 'enviado'])

const PLANTILLAS = [
  { texto: 'Ojo con este rubro', tipo: 'aviso' },
  { texto: '¿Podemos frenar acá?', tipo: 'pregunta' },
  { texto: '¿Qué fue este gasto?', tipo: 'pregunta' },
  { texto: 'Todo bien 👍', tipo: 'ok' },
]

const { enviarAviso } = useCompartido()
const toast = useToast()

const mensaje = ref('')
const tipo = ref('aviso')
const enviando = ref(false)

const contexto = computed(() =>
  props.categoria
    ? `Sobre ${props.categoria.categoriaNombre} de ${props.conexion.emisorNombre || 'esta persona'}.`
    : `Para ${props.conexion.emisorNombre || 'esta persona'}.`,
)

function usarPlantilla(p) {
  mensaje.value = p.texto
  tipo.value = p.tipo
}

async function enviar() {
  enviando.value = true
  try {
    await enviarAviso({
      conexionId: props.conexion.id,
      tipo: tipo.value,
      categoriaId: props.categoria?.categoriaId || null,
      mensaje: mensaje.value.trim(),
    })
    toast.success('Aviso enviado')
    emit('enviado')
    emit('close')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo enviar el aviso')
  } finally {
    enviando.value = false
  }
}
</script>
