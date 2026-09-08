<template>
  <div>
    <SharedSkeletonLoader v-if="cargando" variant="list-item" :count="3" />

    <SharedEmptyState
      v-else-if="!avisos.length"
      compact
      title="Sin avisos"
      message="Acá aparecen los avisos que se envían y los cambios en lo que se comparte."
    />

    <ul v-else class="space-y-2">
      <li
        v-for="aviso in avisos"
        :key="aviso.id"
        class="rounded-xl p-3 border"
        :class="
          aviso.tipo === 'sistema'
            ? 'bg-theme-input border-theme-border'
            : aviso.esMio
              ? 'bg-theme-accent-bg border-theme-accent/40'
              : 'bg-theme-card border-theme-border'
        "
      >
        <div class="flex items-start gap-2">
          <span class="text-sm leading-5" aria-hidden="true">{{ icono(aviso) }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-theme-text break-words">{{ aviso.mensaje }}</p>
            <p class="text-[0.6875rem] text-theme-text-muted mt-0.5">
              {{ etiquetaAutor(aviso) }}
              <template v-if="aviso.categoriaNombre"> · {{ aviso.categoriaNombre }}</template>
              · {{ hace(aviso.createdAt) }}
            </p>
          </div>
          <button
            v-if="!aviso.leidoAt && !aviso.esMio"
            type="button"
            class="tap-target text-[0.6875rem] text-theme-accent hover:underline shrink-0"
            @click="marcar(aviso)"
          >
            Marcar leído
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
const props = defineProps({ conexionId: { type: String, required: true } })

const { fetchAvisos, marcarAvisoLeido } = useCompartido()
const { formatRelativo } = useFechaRelativa()

const avisos = ref([])
const cargando = ref(true)

const ICONOS = { sistema: 'ℹ️', aviso: '⚠️', pregunta: '❓', ok: '👍' }
function icono(a) {
  return ICONOS[a.tipo] || '💬'
}

function etiquetaAutor(a) {
  if (a.tipo === 'sistema') return 'Cambio en lo compartido'
  return a.esMio ? 'Tú' : 'Recibido'
}

function hace(iso) {
  try {
    return formatRelativo(iso)
  } catch {
    return ''
  }
}

async function cargar() {
  cargando.value = true
  try {
    avisos.value = await fetchAvisos(props.conexionId)
  } finally {
    cargando.value = false
  }
}

async function marcar(aviso) {
  await marcarAvisoLeido(aviso.id)
  aviso.leidoAt = new Date().toISOString()
}

onMounted(cargar)
watch(() => props.conexionId, cargar)
defineExpose({ recargar: cargar })
</script>
