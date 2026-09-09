<template>
  <SharedBaseBottomSheet :title="`Qué ve ${nombre}`" @close="$emit('close')">
    <div class="space-y-4">
      <!-- Panel "qué está viendo": evita el olvido de que algo quedó abierto -->
      <div class="rounded-xl bg-theme-input p-3">
        <p class="text-xs font-semibold text-theme-text-sec mb-1">Ahora mismo ve</p>
        <p class="text-sm text-theme-text">{{ resumenActual }}</p>
      </div>

      <CompartidoSelectorCategorias v-model="categorias" :categorias="listaCategorias" />

      <fieldset>
        <legend class="block text-sm font-medium text-theme-text-muted mb-1.5">
          Cuánto detalle ve
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

      <label class="flex items-center justify-between gap-3 py-2 cursor-pointer">
        <span class="min-w-0">
          <span class="block text-sm text-theme-text">Gastos marcados a mano</span>
          <span class="block text-[0.6875rem] text-theme-text-muted"
            >Los que marcas como compartidos desde el registro</span
          >
        </span>
        <input v-model="incluirMarcados" type="checkbox" class="w-5 h-5 accent-theme-accent" />
      </label>

      <label class="flex items-center justify-between gap-3 py-2 cursor-pointer">
        <span class="min-w-0">
          <span class="block text-sm text-theme-text">Pausar</span>
          <span class="block text-[0.6875rem] text-theme-text-muted"
            >Deja de ver todo, sin romper la conexión</span
          >
        </span>
        <input v-model="pausada" type="checkbox" class="w-5 h-5 accent-theme-accent" />
      </label>

      <button
        type="button"
        class="tap-target w-full py-2.5 text-sm font-medium text-red-400 hover:text-red-300"
        @click="$emit('revocar', conexion)"
      >
        Dejar de compartir con {{ nombre }}
      </button>
    </div>

    <template #footer>
      <button
        type="button"
        class="tap-target w-full py-3 rounded-xl bg-theme-accent text-theme-on-accent font-semibold text-sm disabled:opacity-50"
        :disabled="guardando"
        data-testid="compartido-guardar-alcance"
        @click="guardar"
      >
        {{ guardando ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({ conexion: { type: Object, required: true } })
const emit = defineEmits(['close', 'guardado', 'revocar'])

const NIVELES = [
  { valor: 'resumen', titulo: 'Resumen', ayuda: 'Totales por rubro y cómo van' },
  { valor: 'detalle', titulo: 'Detalle', ayuda: 'Además, cada gasto uno por uno' },
]

const { guardarAlcance } = useCompartido()
const { categorias: listaCategorias, fetchCategorias } = useCategorias()
const toast = useToast()

const categorias = ref(
  (props.conexion.categorias || []).map((c) => ({
    categoriaId: c.categoriaId,
    umbralAviso: c.umbralAviso ?? 75,
  })),
)
const nivelDetalle = ref(props.conexion.nivelDetalle)
const incluirMarcados = ref(props.conexion.incluirMarcados)
const pausada = ref(props.conexion.pausada)
const guardando = ref(false)

const nombre = computed(() => props.conexion.receptorEmail || 'esta persona')

const resumenActual = computed(() => {
  if (props.conexion.pausada) return 'Nada: la conexión está pausada.'
  const rubros = props.conexion.categorias?.map((c) => c.nombre) || []
  const nivel =
    props.conexion.nivelDetalle === 'detalle' ? 'con el detalle de cada gasto' : 'solo los totales'
  if (!rubros.length) {
    return props.conexion.incluirMarcados
      ? 'Solo los gastos que marques uno por uno.'
      : 'Nada: no hay rubros compartidos ni gastos marcados.'
  }
  return `${rubros.join(', ')} — ${nivel}.`
})

onMounted(() => fetchCategorias())

async function guardar() {
  guardando.value = true
  try {
    await guardarAlcance(props.conexion.id, {
      categorias: categorias.value,
      nivelDetalle: nivelDetalle.value,
      incluirMarcados: incluirMarcados.value,
      pausada: pausada.value,
    })
    toast.success('Listo, se avisó del cambio')
    emit('guardado')
    emit('close')
  } catch (e) {
    toast.error(handleApiError(e, 'No se pudo guardar'))
  } finally {
    guardando.value = false
  }
}
</script>
