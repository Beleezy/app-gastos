<template>
  <section class="bg-theme-card rounded-2xl border border-theme-border p-4 md:p-5">
    <header class="flex items-center justify-between mb-3">
      <div>
        <h3 class="text-sm md:text-base font-semibold text-theme-text">Plantillas de mes</h3>
        <p class="text-xs text-theme-text-sec">Aplica una plantilla guardada al plan actual</p>
      </div>
      <button
        v-if="planMensualId"
        type="button"
        class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-border-md text-theme-text-sec hover:text-theme-accent text-xs font-medium transition-colors"
        :disabled="guardando"
        :aria-label="guardando ? 'Guardando plantilla' : 'Guardar plan actual como plantilla'"
        @click="guardarComoPlantilla"
      >
        {{ guardando ? 'Guardando…' : 'Guardar como plantilla' }}
      </button>
    </header>

    <div v-if="isLoading" class="space-y-2">
      <SharedSkeletonLoader variant="list-item" :count="2" />
    </div>

    <SharedEmptyState
      v-else-if="error"
      variant="error"
      :message="error"
      action-label="Reintentar"
      compact
      @action="fetchPlantillas"
    />

    <SharedEmptyState
      v-else-if="(plantillas || []).length === 0"
      title="Sin plantillas"
      message="Guarda el plan actual como plantilla para reutilizarlo."
      compact
      hide-icon
    />

    <ul v-else class="space-y-2">
      <li
        v-for="p in plantillas"
        :key="p.id"
        class="flex items-center gap-3 px-3 py-2 rounded-xl bg-theme-input"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-theme-text truncate">{{ p.nombre }}</p>
          <p class="text-[0.7rem] text-theme-text-sec">
            {{ p.gastos?.length || 0 }} gastos
            <span v-if="p.montoPresupuesto != null">· {{ formatCurrency(p.montoPresupuesto) }}</span>
          </p>
        </div>
        <button
          type="button"
          class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-accent text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          :disabled="!planMensualId || aplicandoId === p.id"
          :aria-label="`Aplicar plantilla ${p.nombre}`"
          @click="aplicarPlantilla(p)"
        >
          {{ aplicandoId === p.id ? 'Aplicando…' : 'Aplicar' }}
        </button>
        <button
          type="button"
          class="tap-target h-9 w-9 rounded-full flex items-center justify-center text-theme-text-sec hover:text-red-400 transition-colors"
          :aria-label="`Eliminar plantilla ${p.nombre}`"
          @click="eliminarPlantilla(p)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { usePlantillasMes } from '~/composables/usePlantillasMes'

const props = defineProps({
  planMensualId: { type: [String, Number], default: null },
})

const emit = defineEmits(['aplicada'])

const { plantillas, isLoading, error, fetchPlantillas, crearDesdePlan, aplicar, eliminar } = usePlantillasMes()
const { formatCurrency } = useFormatters()
const toast = useToast()

const guardando = ref(false)
const aplicandoId = ref(null)

async function guardarComoPlantilla() {
  if (!props.planMensualId) return
  const nombre = window.prompt('Nombre de la plantilla:')
  if (!nombre?.trim()) return
  guardando.value = true
  try {
    await crearDesdePlan({ nombre: nombre.trim(), planMensualId: props.planMensualId })
    toast.success('Plantilla guardada')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo guardar la plantilla')
  } finally {
    guardando.value = false
  }
}

async function aplicarPlantilla(p) {
  if (!props.planMensualId) {
    toast.warning('Crea primero el plan del mes')
    return
  }
  aplicandoId.value = p.id
  try {
    const r = await aplicar({ plantillaId: p.id, planMensualId: props.planMensualId })
    if (!r.creados || r.creados === 0) {
      toast.warning('La plantilla no creó gastos. Revisa que tenga ítems válidos.')
    } else if (r.categoriasReemplazadas > 0) {
      toast.success(`Aplicada: ${r.creados} gastos (${r.categoriasReemplazadas} con categoría reemplazada)`)
    } else {
      toast.success(`Aplicada: ${r.creados} gastos creados`)
    }
    emit('aplicada', r)
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo aplicar la plantilla')
  } finally {
    aplicandoId.value = null
  }
}

async function eliminarPlantilla(p) {
  if (!window.confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return
  try {
    await eliminar(p.id)
    toast.success('Plantilla eliminada')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo eliminar')
  }
}

onMounted(fetchPlantillas)
</script>
