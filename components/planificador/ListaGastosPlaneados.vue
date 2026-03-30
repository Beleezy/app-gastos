<template>
  <div class="px-4 py-3">
    <!-- Filters -->
    <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="f in filtros"
        :key="f.value"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        :class="filtroActual === f.value ? 'bg-indigo-500 text-white' : 'bg-primary-800 text-gray-400'"
        @click="filtroActual = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-primary-800 rounded-xl p-4 animate-pulse">
        <div class="flex gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary-700"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-primary-700 rounded w-3/4"></div>
            <div class="h-3 bg-primary-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="categoriasFiltered.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-full bg-primary-800 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-gray-500 text-sm">No hay gastos planificados</p>
      <p class="text-gray-600 text-xs mt-1">Agrega tu primer gasto con el botón +</p>
    </div>

    <!-- Category Groups -->
    <div v-else>
      <div v-for="cat in categoriasFiltered" :key="cat.categoriaId" class="mb-5">
        <!-- Category Header -->
        <div class="flex items-center gap-2 mb-2.5">
          <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: cat.color }"></span>
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ cat.nombre }}</h3>
          <span class="text-xs text-gray-500 ml-auto">S/ {{ formatMonto(cat.total) }}</span>
        </div>

        <!-- Expense Items -->
        <div
          v-for="gasto in cat.gastos"
          :key="gasto.id"
          class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30 transition-all"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                :style="{ backgroundColor: cat.color + '26' }"
              >
                <span class="text-base">{{ getEmoji(cat.nombre) }}</span>
              </div>
              <div>
                <p class="text-sm font-medium text-white">{{ gasto.concepto }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ formatFecha(gasto.fechaProbablePago) }}</p>
                <div v-if="gasto.esRecurrente" class="flex items-center gap-1 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span class="text-[10px] text-indigo-400">Recurrente</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-white">S/ {{ formatMonto(gasto.montoEstimado) }}</p>
              <button
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 transition-colors"
                :class="gasto.estado === 'pagado'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-orange-500/15 text-orange-400'"
                @click="toggleEstado(gasto)"
              >
                {{ gasto.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-4 mt-2 pt-2 border-t border-primary-700/20">
            <button class="text-xs text-gray-600 hover:text-indigo-400 transition-colors flex items-center gap-1" @click="emit('editar', gasto)">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button class="text-xs text-gray-600 hover:text-red-400 transition-colors flex items-center gap-1" @click="eliminarGasto(gasto)">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom spacer for FAB -->
      <div class="h-16"></div>
    </div>

    <!-- Confirmation modal for recurring delete -->
    <div v-if="gastoParaEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="gastoParaEliminar = null"></div>
      <div class="relative bg-primary-800 rounded-2xl p-5 w-full max-w-sm border border-primary-700/50">
        <h3 class="text-base font-semibold text-white mb-2">Eliminar gasto recurrente</h3>
        <p class="text-sm text-gray-400 mb-5">Este gasto se repite en meses futuros. ¿Qué deseas hacer?</p>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors"
            @click="confirmarEliminar(true)"
          >
            Eliminar este y todos los futuros
          </button>
          <button
            class="w-full py-2.5 rounded-xl bg-primary-700 text-gray-300 text-sm font-medium hover:bg-primary-600 transition-colors"
            @click="confirmarEliminar(false)"
          >
            Eliminar solo este mes
          </button>
          <button
            class="w-full py-2.5 rounded-xl text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors"
            @click="gastoParaEliminar = null"
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

const { gastosPorCategoria, isLoading, toggleEstado, deleteGastoPlaneado } = usePlanificador()

const filtroActual = ref('todos')

const filtros = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'pagado', label: 'Pagados' },
]

const categoriasFiltered = computed(() => {
  if (filtroActual.value === 'todos') return gastosPorCategoria.value
  return gastosPorCategoria.value
    .map(cat => ({
      ...cat,
      gastos: cat.gastos.filter(g => g.estado === filtroActual.value),
      total: cat.gastos.filter(g => g.estado === filtroActual.value).reduce((s, g) => s + g.montoEstimado, 0),
    }))
    .filter(cat => cat.gastos.length > 0)
})

const emojiMap = {
  'Alimentacion': '🛒',
  'Transporte': '🚗',
  'Vivienda': '🏠',
  'Salud': '🏥',
  'Educacion': '📚',
  'Entretenimiento': '🎬',
  'Vestimenta': '👕',
  'Servicios': '📡',
  'Ahorro': '🐷',
  'Deudas': '💳',
  'Otros': '📦',
}

function getEmoji(nombre) {
  return emojiMap[nombre] || '📋'
}

function formatMonto(valor) {
  return Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const dia = d.getDate()
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dia} de ${meses[d.getMonth()]}, ${d.getFullYear()}`
}

const gastoParaEliminar = ref(null)

function eliminarGasto(gasto) {
  if (gasto.esRecurrente && gasto.recurrenteGrupoId) {
    gastoParaEliminar.value = gasto
  } else {
    deleteGastoPlaneado(gasto.id, false)
  }
}

async function confirmarEliminar(incluirFuturos) {
  const gasto = gastoParaEliminar.value
  if (!gasto) return
  gastoParaEliminar.value = null
  await deleteGastoPlaneado(gasto.id, incluirFuturos)
}
</script>
