<template>
  <div v-if="invitaciones.length" class="space-y-2">
    <article
      v-for="inv in invitaciones"
      :key="inv.id"
      class="rounded-2xl border border-theme-accent/40 bg-theme-accent-bg p-4"
    >
      <p class="text-sm text-theme-text">
        <strong>{{ inv.emisorNombre }}</strong> quiere compartir contigo en qué está gastando.
      </p>
      <p v-if="inv.mensaje" class="text-xs text-theme-text-muted mt-1 italic">
        “{{ inv.mensaje }}”
      </p>
      <p class="text-[0.6875rem] text-theme-text-muted mt-1.5">
        {{ descripcion(inv) }}
      </p>

      <div class="flex gap-2 mt-3">
        <button
          type="button"
          class="tap-target flex-1 py-2.5 rounded-xl bg-theme-accent text-theme-on-accent text-sm font-semibold disabled:opacity-50"
          :disabled="procesando === inv.id"
          data-testid="compartido-aceptar"
          @click="responder(inv, true)"
        >
          Aceptar
        </button>
        <button
          type="button"
          class="tap-target flex-1 py-2.5 rounded-xl bg-theme-input border border-theme-border text-sm font-medium text-theme-text-sec disabled:opacity-50"
          :disabled="procesando === inv.id"
          @click="responder(inv, false)"
        >
          Rechazar
        </button>
      </div>
    </article>
  </div>
</template>

<script setup>
defineProps({ invitaciones: { type: Array, default: () => [] } })
const emit = defineEmits(['respondida'])

const { aceptar, rechazar } = useCompartido()
const toast = useToast()
const procesando = ref(null)

function descripcion(inv) {
  const n = inv.categorias?.length || 0
  const rubros = n ? inv.categorias.map((c) => c.nombre).join(', ') : 'gastos sueltos'
  const nivel = inv.nivelDetalle === 'detalle' ? 'con detalle de cada gasto' : 'solo totales'
  return `Verías: ${rubros} — ${nivel}.`
}

async function responder(inv, aceptando) {
  procesando.value = inv.id
  try {
    if (aceptando) {
      await aceptar(inv.id)
      toast.success(`Ahora ves los gastos de ${inv.emisorNombre}`)
    } else {
      await rechazar(inv.id)
      toast.info('Invitación rechazada')
    }
    emit('respondida')
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo procesar la invitación'))
  } finally {
    procesando.value = null
  }
}
</script>
