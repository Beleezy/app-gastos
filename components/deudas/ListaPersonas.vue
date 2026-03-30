<template>
  <div class="px-4 py-3">
    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-primary-800 rounded-xl p-4 animate-pulse">
        <div class="flex gap-3">
          <div class="w-12 h-12 rounded-full bg-primary-700"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-primary-700 rounded w-3/4"></div>
            <div class="h-3 bg-primary-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="personas.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-full bg-primary-800 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <p class="text-gray-500 text-sm">
        {{ tabActual === 'me_deben' ? 'Nadie te debe por ahora' : 'No tienes deudas pendientes' }}
      </p>
      <p class="text-gray-600 text-xs mt-1">Agrega una nueva deuda con el boton +</p>
    </div>

    <!-- Personas List -->
    <div v-else class="space-y-2.5">
      <button
        v-for="persona in personas"
        :key="persona.id"
        class="w-full bg-primary-800 rounded-xl p-4 border border-primary-700/30 transition-all active:bg-primary-700/50 text-left"
        @click="emit('seleccionar', persona)"
      >
        <div class="flex items-center gap-3">
          <!-- Avatar -->
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-semibold"
            :class="tabActual === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
          >
            {{ getInitials(persona.nombre) }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-white truncate">{{ persona.nombre }}</p>
              <span v-if="persona.tipo === 'organizacion'" class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary-700 text-gray-400">
                ORG
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ persona.deudasActivas }} deuda{{ persona.deudasActivas !== 1 ? 's' : '' }} activa{{ persona.deudasActivas !== 1 ? 's' : '' }}
            </p>
          </div>

          <!-- Amount -->
          <div class="text-right shrink-0">
            <p
              class="text-sm font-semibold"
              :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
            >
              S/ {{ formatMonto(persona.totalPendiente) }}
            </p>
            <!-- Status indicator -->
            <div class="flex items-center justify-end gap-1 mt-1">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="persona.totalPendiente > 0 ? (tabActual === 'me_deben' ? 'bg-emerald-400' : 'bg-red-400') : 'bg-gray-600'"
              ></span>
              <span class="text-[10px] text-gray-500">
                {{ persona.totalPendiente > 0 ? 'Pendiente' : 'Saldado' }}
              </span>
            </div>
          </div>

          <!-- Chevron -->
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      <!-- Bottom spacer for FAB -->
      <div class="h-16"></div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['seleccionar'])

const { personas, isLoading, tabActual } = useDeudas()

function getInitials(nombre) {
  return nombre
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatMonto(valor) {
  return Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
