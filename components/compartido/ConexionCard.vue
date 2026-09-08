<template>
  <section class="rounded-2xl bg-theme-card border border-theme-border overflow-hidden">
    <!-- Cabecera: persona + estado global + sincronizar -->
    <header class="flex items-center gap-3 p-4">
      <div
        class="w-10 h-10 rounded-full bg-theme-accent-bg flex items-center justify-center text-theme-accent font-bold shrink-0"
        aria-hidden="true"
      >
        {{ inicial }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-theme-text truncate">{{ nombre }}</p>
        <p class="text-[0.6875rem] text-theme-text-muted">{{ subtitulo }}</p>
      </div>
      <button
        type="button"
        class="tap-target flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-input border border-theme-border text-xs font-medium text-theme-text-sec hover:border-theme-accent transition-colors disabled:opacity-50"
        :disabled="sincronizando"
        data-testid="compartido-sincronizar"
        @click="sincronizar"
      >
        <svg
          class="w-4 h-4"
          :class="sincronizando ? 'animate-spin' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 4v5h5M20 20v-5h-5M20 9A8 8 0 006.3 5.3M4 15a8 8 0 0013.7 3.7"
          />
        </svg>
        Sincronizar
      </button>
    </header>

    <div class="px-4 pb-4 space-y-3">
      <SharedMonthSelector
        :label="etiquetaMes"
        :es-actual="esMesActual"
        :disable-next="esMesActual"
        @prev="cambiarMes(-1)"
        @next="cambiarMes(1)"
        @go-to-current="irAlMesActual"
      />

      <SharedSkeletonLoader v-if="cargando && !vista" variant="card" :count="3" />

      <template v-else-if="vista">
        <div class="flex items-baseline justify-between">
          <p class="text-xs text-theme-text-muted">Total visible</p>
          <SharedMoney :value="vista.totalVisible" class="text-base font-bold text-theme-text" />
        </div>

        <SharedEmptyState
          v-if="!vista.categorias.length"
          compact
          title="Nada que ver todavía"
          :message="`${nombre} no registró gastos en lo que comparte durante este mes.`"
        />

        <CompartidoCategoriaCompartida
          v-for="cat in vista.categorias"
          :key="cat.categoriaId"
          :categoria="cat"
          @avisar="$emit('avisar', { conexion, categoria: $event })"
        />

        <!-- Nivel detalle: la lista de gastos, solo lectura -->
        <div v-if="vista.detalle.length" class="pt-1">
          <p class="text-xs font-semibold text-theme-text-sec mb-2">
            Gastos del mes ({{ vista.detalle.length }})
          </p>
          <ul class="space-y-1.5">
            <li
              v-for="g in detalleVisible"
              :key="g.id"
              class="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-theme-input"
            >
              <div class="min-w-0">
                <p class="text-sm text-theme-text truncate">{{ g.concepto }}</p>
                <p class="text-[0.6875rem] text-theme-text-muted">{{ formatFecha(g.fecha) }}</p>
              </div>
              <SharedMoney :value="g.monto" class="text-sm text-theme-text-sec shrink-0" />
            </li>
          </ul>
          <button
            v-if="vista.detalle.length > limiteDetalle"
            type="button"
            class="tap-target mt-2 text-xs font-medium text-theme-accent hover:underline"
            @click="limiteDetalle += 30"
          >
            Ver más
          </button>
        </div>

        <p class="text-[0.6875rem] text-theme-text-muted pt-1">
          Actualizado {{ hace(vista.actualizadoEn) }}
        </p>
      </template>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  conexion: { type: Object, required: true },
})
const emit = defineEmits(['avisar'])

const { fetchVista, marcarVisto } = useCompartido()
const toast = useToast()
const { vibrate } = useHaptic()
const { formatFecha } = useFormatters()
const { formatRelativo } = useFechaRelativa()

const hoy = new Date()
const mes = ref(hoy.getMonth() + 1)
const anio = ref(hoy.getFullYear())
const vista = ref(null)
const cargando = ref(false)
const sincronizando = ref(false)
const limiteDetalle = ref(30)

const nombre = computed(() => props.conexion.emisorNombre || 'Usuario')
const inicial = computed(() => nombre.value.trim().charAt(0).toUpperCase() || '?')
const detalleVisible = computed(() => (vista.value?.detalle || []).slice(0, limiteDetalle.value))

const esMesActual = computed(
  () => mes.value === hoy.getMonth() + 1 && anio.value === hoy.getFullYear(),
)
const etiquetaMes = computed(() =>
  new Date(anio.value, mes.value - 1, 1).toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  }),
)

const subtitulo = computed(() => {
  const nivel = props.conexion.nivelDetalle === 'detalle' ? 'detalle' : 'resumen'
  const n = props.conexion.categorias?.length || 0
  const rubros = n === 1 ? '1 rubro' : `${n} rubros`
  return `${rubros} · modo ${nivel}`
})

function hace(iso) {
  try {
    return formatRelativo(iso)
  } catch {
    return 'recién'
  }
}

async function cargar({ fresh = false } = {}) {
  cargando.value = true
  try {
    const { data } = await fetchVista(props.conexion.id, {
      mes: mes.value,
      anio: anio.value,
      fresh,
    })
    vista.value = data
    limiteDetalle.value = 30
    return data
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo cargar la vista')
    return null
  } finally {
    cargando.value = false
  }
}

async function sincronizar() {
  sincronizando.value = true
  vibrate(10)
  try {
    const previo = vista.value
    const { data, nuevos } = await fetchVista(props.conexion.id, {
      mes: mes.value,
      anio: anio.value,
      fresh: true,
    })
    vista.value = data
    // Decir "sin novedades" cuando de verdad no las hay es lo que hace que
    // el botón se sienta honesto en vez de decorativo.
    if (!previo) toast.success('Datos actualizados')
    else if (nuevos > 0) toast.success(nuevos === 1 ? '1 gasto nuevo' : `${nuevos} gastos nuevos`)
    else toast.info('Sin novedades')
    await marcarVisto(props.conexion.id)
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo sincronizar')
  } finally {
    sincronizando.value = false
  }
}

function cambiarMes(delta) {
  const d = new Date(anio.value, mes.value - 1 + delta, 1)
  mes.value = d.getMonth() + 1
  anio.value = d.getFullYear()
  cargar()
}

function irAlMesActual() {
  mes.value = hoy.getMonth() + 1
  anio.value = hoy.getFullYear()
  cargar()
}

onMounted(async () => {
  await cargar()
  await marcarVisto(props.conexion.id)
})

defineExpose({ recargar: () => cargar({ fresh: true }) })
</script>
