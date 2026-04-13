<template>
  <div class="px-4 py-3">
    <div class="mb-4 flex items-center gap-2">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-text-sec" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar proyecto, detalle u opcion..."
          class="w-full rounded-xl border border-theme-border bg-theme-card py-2 pl-9 pr-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent transition-colors"
        />
      </div>
      <div class="rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-[11px] text-theme-text-sec">
        {{ gastosFuturos.length }} total
      </div>
    </div>

    <div v-if="isLoading && gastosFuturos.length === 0" class="space-y-3">
      <div v-for="i in 2" :key="i" class="rounded-2xl border border-theme-border bg-theme-card p-4 animate-pulse">
        <div class="h-4 w-2/3 rounded bg-theme-border-md"></div>
        <div class="mt-3 h-20 rounded-xl bg-theme-input"></div>
      </div>
    </div>

    <div v-else-if="gastosFiltrados.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card px-5 py-10 text-center">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-input text-sky-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h10.5" />
        </svg>
      </div>
      <p class="text-sm text-theme-text">{{ busqueda ? 'No hay coincidencias' : 'Crea tu primer gasto futuro' }}</p>
      <p class="mt-1 text-xs text-theme-text-sec">
        {{ busqueda ? 'Prueba con otro termino o limpia el filtro.' : 'Ejemplos: PC nueva, outfit invierno, setup streaming.' }}
      </p>
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="proyecto in gastosFiltrados"
        :key="proyecto.id"
        class="overflow-hidden rounded-2xl border border-theme-border bg-theme-card"
      >
        <div class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 gap-3">
              <div
                class="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                :style="{ backgroundColor: (proyecto.categoriaColor || '#6b7280') + '22' }"
              >
                <span class="text-lg">{{ proyecto.categoriaIcono || '📦' }}</span>
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate text-sm font-semibold text-theme-text">{{ proyecto.tipoGasto }}</h3>
                  <span class="rounded-full bg-theme-input px-2 py-1 text-[10px] text-theme-text-sec">
                    {{ proyecto.categoriaNombre || 'Sin categoria' }}
                  </span>
                </div>
                <p v-if="proyecto.descripcion" class="mt-1 text-xs text-theme-text-sec">{{ proyecto.descripcion }}</p>
                <p class="mt-1 text-[11px] text-theme-text-muted">
                  {{ proyecto.resumen.totalDetalles }} detalles · {{ proyecto.resumen.totalOpciones }} opciones
                </p>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-sm font-semibold text-sky-300">{{ currencySymbol }} {{ formatMonto(proyecto.resumen.totalPromedio) }}</p>
              <p class="text-[10px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(proyecto.resumen.totalMinimo) }} - {{ currencySymbol }} {{ formatMonto(proyecto.resumen.totalMaximo) }}</p>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="rounded-xl bg-theme-input px-3 py-2">
              <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Min</p>
              <p class="mt-1 text-xs font-medium text-emerald-400">{{ currencySymbol }} {{ formatMonto(proyecto.resumen.totalMinimo) }}</p>
            </div>
            <div class="rounded-xl bg-theme-input px-3 py-2">
              <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Prom</p>
              <p class="mt-1 text-xs font-medium text-sky-300">{{ currencySymbol }} {{ formatMonto(proyecto.resumen.totalPromedio) }}</p>
            </div>
            <div class="rounded-xl bg-theme-input px-3 py-2">
              <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Max</p>
              <p class="mt-1 text-xs font-medium text-amber-300">{{ currencySymbol }} {{ formatMonto(proyecto.resumen.totalMaximo) }}</p>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-2">
            <button
              class="inline-flex items-center gap-1 rounded-full bg-theme-input px-3 py-1.5 text-[11px] text-theme-text-sec transition-colors hover:text-theme-text"
              @click="toggleExpandido(proyecto.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 transition-transform" :class="estaExpandido(proyecto.id) ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25L12 15.75 4.5 8.25" />
              </svg>
              {{ estaExpandido(proyecto.id) ? 'Ocultar detalle' : 'Ver detalle' }}
            </button>
            <div class="flex items-center gap-4">
              <button class="text-xs text-theme-text-sec transition-colors hover:text-theme-accent" @click="emit('editar', proyecto)">Editar</button>
              <button class="text-xs text-theme-text-sec transition-colors hover:text-red-400" @click="proyectoAEliminar = proyecto">Eliminar</button>
            </div>
          </div>
        </div>

        <div v-if="estaExpandido(proyecto.id)" class="border-t border-theme-border bg-theme-input/45 px-4 py-4">
          <div class="space-y-3">
            <div
              v-for="detalle in proyecto.detalles"
              :key="detalle.id"
              class="rounded-2xl border border-theme-border bg-theme-card p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-theme-text">{{ detalle.nombre }}</p>
                  <p v-if="detalle.notas" class="mt-1 text-[11px] text-theme-text-sec">{{ detalle.notas }}</p>
                  <p class="mt-1 text-[10px] text-theme-text-muted">
                    {{ detalle.opciones.length }} opcion{{ detalle.opciones.length !== 1 ? 'es' : '' }}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-[11px] font-medium text-sky-300">{{ currencySymbol }} {{ formatMonto(detalle.resumen.promedioReferencia || 0) }}</p>
                  <p class="text-[10px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(detalle.resumen.minimoReferencia || 0) }} - {{ currencySymbol }} {{ formatMonto(detalle.resumen.maximoReferencia || 0) }}</p>
                </div>
              </div>

              <div v-if="detalle.opciones.length" class="mt-3 space-y-2">
                <div
                  v-for="opcion in detalle.opciones"
                  :key="opcion.id"
                  class="rounded-xl border border-theme-border bg-theme-input px-3 py-3"
                >
                  <div class="flex gap-3">
                    <img
                      v-if="opcion.imagenUrl"
                      :src="opcion.imagenUrl"
                      :alt="opcion.nombre"
                      class="h-16 w-16 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-theme-text">{{ opcion.nombre }}</p>
                          <a
                            v-if="opcion.referenciaUrl"
                            :href="opcion.referenciaUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] text-theme-accent hover:text-theme-accent-light"
                          >
                            <span class="truncate">{{ hostDeUrl(opcion.referenciaUrl) }}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 10.5v7.5h7.5" />
                            </svg>
                          </a>
                        </div>
                        <div class="shrink-0 text-right">
                          <p class="text-xs font-semibold text-sky-300">{{ currencySymbol }} {{ formatMonto(opcion.precioPromedio || 0) }}</p>
                          <p class="text-[10px] text-theme-text-sec">{{ currencySymbol }} {{ formatMonto(opcion.precioMinimo || 0) }} - {{ currencySymbol }} {{ formatMonto(opcion.precioMaximo || 0) }}</p>
                        </div>
                      </div>
                      <p v-if="opcion.notas" class="mt-2 text-[11px] text-theme-text-sec">{{ opcion.notas }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="mt-3 rounded-xl border border-dashed border-theme-border bg-theme-input/70 px-3 py-4 text-center text-[11px] text-theme-text-sec">
                Este detalle aun no tiene opciones tentativas.
              </div>
            </div>
          </div>
        </div>
      </article>

      <div class="h-16"></div>
    </div>

    <div v-if="proyectoAEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="proyectoAEliminar = null"></div>
      <div class="relative w-full max-w-sm rounded-2xl border border-theme-border bg-theme-card p-5">
        <h3 class="text-base font-semibold text-theme-text">Eliminar gasto futuro</h3>
        <p class="mt-2 text-sm text-theme-text-sec">
          Se eliminaran el proyecto, sus detalles y todas las opciones guardadas.
        </p>
        <p class="mt-2 text-sm font-medium text-theme-text">{{ proyectoAEliminar.tipoGasto }}</p>
        <div class="mt-5 space-y-2">
          <button
            class="w-full rounded-xl bg-red-500/15 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
            :disabled="eliminando"
            @click="confirmarEliminar"
          >
            {{ eliminando ? 'Eliminando...' : 'Eliminar proyecto' }}
          </button>
          <button
            class="w-full rounded-xl py-2.5 text-sm text-theme-text-sec transition-colors hover:text-theme-text"
            @click="proyectoAEliminar = null"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['editar'])

const { gastosFuturos, deleteGastoFuturo, isLoading } = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()
const { success, error: toastError } = useToast()

const busqueda = ref('')
const expandido = ref({})
const proyectoAEliminar = ref(null)
const eliminando = ref(false)

watch(gastosFuturos, (items) => {
  if (!items.length) {
    expandido.value = {}
    return
  }

  if (!Object.keys(expandido.value).length) {
    expandido.value = { [items[0].id]: true }
  }
}, { immediate: true })

const gastosFiltrados = computed(() => {
  const term = busqueda.value.trim().toLowerCase()
  if (!term) return gastosFuturos.value

  return gastosFuturos.value.filter((proyecto) => {
    const hayEnProyecto = [
      proyecto.tipoGasto,
      proyecto.descripcion,
      proyecto.categoriaNombre,
    ].some(value => (value || '').toLowerCase().includes(term))

    if (hayEnProyecto) return true

    return proyecto.detalles.some(detalle =>
      (detalle.nombre || '').toLowerCase().includes(term)
      || (detalle.notas || '').toLowerCase().includes(term)
      || detalle.opciones.some(opcion =>
        (opcion.nombre || '').toLowerCase().includes(term)
        || (opcion.notas || '').toLowerCase().includes(term)
        || (opcion.referenciaUrl || '').toLowerCase().includes(term)
      )
    )
  })
})

function toggleExpandido(id) {
  expandido.value = {
    ...expandido.value,
    [id]: !expandido.value[id],
  }
}

function estaExpandido(id) {
  return !!expandido.value[id]
}

function hostDeUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Abrir enlace'
  }
}

async function confirmarEliminar() {
  if (!proyectoAEliminar.value) return

  eliminando.value = true
  try {
    await deleteGastoFuturo(proyectoAEliminar.value.id)
    success('Gasto futuro eliminado')
    proyectoAEliminar.value = null
  } catch (e) {
    toastError(e?.data?.message || e?.message || 'No se pudo eliminar el gasto futuro')
  } finally {
    eliminando.value = false
  }
}
</script>
