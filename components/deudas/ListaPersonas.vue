<template>
  <div class="px-4 py-3">
    <!-- Barra de búsqueda y ordenamiento -->
    <div class="flex items-center gap-2 mb-3">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar persona..."
          class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-primary-900/60 border border-primary-700/30 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
        />
        <button v-if="busqueda" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" @click="busqueda = ''">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <!-- Orden toggle -->
      <button
        class="w-10 h-10 rounded-xl bg-primary-900/60 border border-primary-700/30 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-colors shrink-0"
        :title="'Ordenar por: ' + ordenLabels[ordenActual]"
        @click="ciclarOrden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      </button>
    </div>
    <p v-if="ordenActual !== 'monto'" class="text-[10px] text-gray-600 mb-2 px-1">
      Ordenando por: {{ ordenLabels[ordenActual] }}
    </p>

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
    <div v-else-if="personasFiltradas.length === 0" class="text-center py-12">
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
        v-for="persona in personasFiltradas"
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
              {{ currencySymbol }} {{ formatMonto(persona.totalPendiente) }}
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

          <!-- PDF export button (only for "me_deben") -->
          <button
            v-if="tabActual === 'me_deben' && persona.totalPendiente > 0"
            class="w-8 h-8 rounded-lg bg-primary-700/50 flex items-center justify-center text-gray-500 hover:text-blue-400 active:text-blue-300 transition-colors shrink-0"
            title="Exportar PDF"
            @click.stop="exportarPdf(persona)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

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
const { generarPdfDeuda } = useDeudaPdf()

const busqueda = ref('')
const ordenActual = ref('monto') // monto | nombre | antiguo
const ordenOpciones = ['monto', 'nombre', 'antiguo']
const ordenLabels = { monto: 'Mayor monto', nombre: 'Nombre A-Z', antiguo: 'Más antiguo' }

function ciclarOrden() {
  const idx = ordenOpciones.indexOf(ordenActual.value)
  ordenActual.value = ordenOpciones[(idx + 1) % ordenOpciones.length]
}

const personasFiltradas = computed(() => {
  let result = [...personas.value]

  // Filtrar por búsqueda
  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase()
    result = result.filter(p => p.nombre.toLowerCase().includes(q))
  }

  // Ordenar
  if (ordenActual.value === 'monto') {
    result.sort((a, b) => (b.totalPendiente || 0) - (a.totalPendiente || 0))
  } else if (ordenActual.value === 'nombre') {
    result.sort((a, b) => a.nombre.localeCompare(b.nombre))
  } else if (ordenActual.value === 'antiguo') {
    result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  return result
})

async function exportarPdf(persona) {
  try {
    const deudas = await $fetch('/api/deudas', {
      query: { personaId: persona.id, tipo: 'me_deben' }
    })
    const activas = deudas.filter(d => d.estado === 'pendiente' || d.estado === 'parcial')
    const saldadas = deudas.filter(d => d.estado === 'pagado' || d.estado === 'archivado')
    await generarPdfDeuda(persona, activas, saldadas)
  } catch (e) {
    console.error('Error al generar PDF:', e)
  }
}

function getInitials(nombre) {
  return nombre
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const { currencySymbol, formatMonto } = useCurrency()
</script>
