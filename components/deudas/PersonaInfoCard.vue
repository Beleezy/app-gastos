<template>
  <div v-if="personaSeleccionada" class="px-4 lg:px-0 pt-4 lg:pt-6 pb-2">
    <div class="bg-theme-card rounded-2xl p-4 border border-theme-border">
      <!-- Botón volver (solo móvil; desktop ya tiene el botón debajo del card) -->
      <button
        class="lg:hidden flex items-center gap-1.5 text-theme-text-muted text-xs mb-3 active:text-theme-text transition-colors"
        @click="volverALista"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver a la lista
      </button>

      <!-- Avatar + nombre + contacto -->
      <div class="flex items-center gap-3 mb-3">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0"
          :class="tabActual === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
        >
          {{ getInitials(personaSeleccionada.nombre) }}
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold text-theme-text truncate">{{ personaSeleccionada.nombre }}</h2>
          <p v-if="personaSeleccionada.contacto" class="text-xs text-theme-text-sec truncate">
            {{ personaSeleccionada.contacto }}
          </p>
          <span
            v-if="personaSeleccionada.vinculadoUsuarioId"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-theme-accent-bg text-theme-accent text-[0.625rem] font-medium mt-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Vinculado
          </span>
        </div>
      </div>

      <!-- Métricas: total pendiente + # deudas activas + último movimiento -->
      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-xl bg-theme-input p-2.5 text-center">
          <p class="text-[0.625rem] uppercase tracking-wide text-theme-text-sec">
            {{ tabActual === 'me_deben' ? 'Por cobrar' : 'Por pagar' }}
          </p>
          <p
            class="text-sm font-bold mt-0.5 tabular-nums truncate"
            :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ currencySymbol }} {{ formatMonto(totalPendientePersona) }}
          </p>
        </div>
        <div class="rounded-xl bg-theme-input p-2.5 text-center">
          <p class="text-[0.625rem] uppercase tracking-wide text-theme-text-sec">Activas</p>
          <p class="text-sm font-bold mt-0.5 text-theme-text">
            {{ deudasActivasPersona.length }}
          </p>
        </div>
        <div class="rounded-xl bg-theme-input p-2.5 text-center">
          <p class="text-[0.625rem] uppercase tracking-wide text-theme-text-sec">Último mov.</p>
          <p class="text-[0.7rem] font-medium mt-0.5 text-theme-text truncate">
            {{ ultimoMovimientoLabel }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getInitials } from '~/utils/constants'

const {
  tabActual, personaSeleccionada,
  deudasActivasPersona, totalPendientePersona,
  pagosPersona, volverALista,
} = useDeudas()

const { currencySymbol, formatMonto } = useCurrency()
const { formatRelativo } = useFechaRelativa()

const ultimoMovimientoLabel = computed(() => {
  // Prioridad: último pago si existe; si no, fecha de la deuda activa más reciente.
  const pagos = pagosPersona.value || []
  if (pagos.length > 0) {
    const ultimo = [...pagos].sort((a, b) => (b.fechaPago || '').localeCompare(a.fechaPago || ''))[0]
    if (ultimo?.fechaPago) return formatRelativo(ultimo.fechaPago)
  }
  const activas = deudasActivasPersona.value || []
  if (activas.length > 0) {
    const reciente = [...activas].sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''))[0]
    if (reciente?.fechaCreacion) return formatRelativo(reciente.fechaCreacion)
  }
  return '—'
})
</script>
