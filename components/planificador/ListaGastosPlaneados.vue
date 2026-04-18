<template>
  <div class="px-4 lg:px-0 py-3">
    <!-- Search + Sort -->
    <div class="flex items-center gap-2 mb-3">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-sec" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar concepto..."
          class="w-full pl-9 pr-3 py-2 rounded-xl bg-theme-card border border-theme-border text-theme-text placeholder-gray-600 text-xs focus:outline-none focus:border-theme-accent transition-colors"
        />
      </div>
      <button
        class="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-card border border-theme-border text-theme-text-muted text-xs hover:bg-theme-border-md transition-colors"
        @click="ciclarOrden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        {{ ordenLabel }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="f in filtrosConContador"
        :key="f.value"
        class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        :class="[
          filtroActual === f.value ? (f.accent || 'bg-theme-accent text-theme-on-accent') : 'bg-theme-card text-theme-text-muted',
          f.count === 0 && filtroActual !== f.value ? 'opacity-50' : ''
        ]"
        @click="filtroActual = f.value"
      >
        {{ f.label }}
        <span
          class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
          :class="filtroActual === f.value ? 'bg-black/15 text-inherit' : 'bg-theme-border-md text-theme-text'"
        >
          {{ f.count }}
        </span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-theme-card rounded-xl p-4 animate-pulse">
        <div class="flex gap-3">
          <div class="w-10 h-10 rounded-xl bg-theme-border-md"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-theme-border-md rounded w-3/4"></div>
            <div class="h-3 bg-theme-border-md rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="categoriasFiltered.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-full bg-theme-card flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-theme-text-sec text-sm">No hay gastos planificados</p>
      <p class="text-theme-text-muted text-xs mt-1">Agrega tu primer gasto con el botón +</p>
    </div>

    <!-- Category Groups -->
    <div v-else>
      <div v-for="cat in categoriasFiltered" :key="cat.categoriaId" class="mb-5">
        <!-- Category Header -->
        <div class="mb-2.5">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: cat.color }"></span>
            <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">{{ cat.nombre }}</h3>
            <span class="text-xs text-theme-text-sec ml-auto">{{ currencySymbol }} {{ formatMonto(cat.total) }}</span>
          </div>
          <!-- Real vs Planned mini bar -->
          <div v-if="cat.totalReal > 0" class="ml-3.5 space-y-1">
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-theme-input rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="cat.totalReal > cat.total ? 'bg-red-400' : 'bg-emerald-400'"
                  :style="{ width: Math.min((cat.totalReal / cat.total) * 100, 100) + '%' }"
                ></div>
              </div>
              <span class="text-[10px] shrink-0 font-medium" :class="cat.totalReal > cat.total ? 'text-red-400' : 'text-emerald-400'">
                {{ currencySymbol }} {{ formatMonto(cat.totalReal) }}
              </span>
            </div>
            <!-- Diferencia numérica -->
            <div class="flex items-center gap-1">
              <svg v-if="cat.totalReal > cat.total" xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              <span class="text-[10px]" :class="cat.totalReal > cat.total ? 'text-red-400' : 'text-emerald-400'">
                {{ cat.totalReal > cat.total ? 'Excede' : 'Ahorra' }} {{ currencySymbol }} {{ formatMonto(Math.abs(cat.totalReal - cat.total)) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Expense Items -->
        <div
          v-for="gasto in cat.gastos"
          :key="gasto.id"
          class="bg-theme-card rounded-xl p-3.5 mb-2 border transition-all"
          :class="esVencido(gasto) ? 'border-red-500/40' : (esHoyGasto(gasto) && gasto.estado === 'pendiente' ? 'border-orange-500/40' : 'border-theme-border')"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                :style="{ backgroundColor: (gasto._catColor || cat.color) + '26' }"
              >
                <span class="text-base">{{ getEmoji(gasto._catNombre || cat.nombre) }}</span>
              </div>
              <div>
                <p class="text-sm font-medium text-theme-text">{{ gasto.concepto }}</p>
                <p class="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span v-if="gasto._catNombre" class="inline-flex items-center gap-1 text-theme-text-sec">
                    <span class="w-1.5 h-1.5 rounded-full inline-block" :style="{ backgroundColor: gasto._catColor }"></span>
                    {{ gasto._catNombre }}
                  </span>
                  <span
                    class="inline-flex items-center gap-1 font-medium"
                    :class="esVencido(gasto) ? 'text-red-400' : (esHoyGasto(gasto) && gasto.estado === 'pendiente' ? 'text-orange-400' : 'text-theme-text-sec')"
                    :title="formatFecha(gasto.fechaProbablePago)"
                  >
                    <svg v-if="esVencido(gasto)" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
                    </svg>
                    {{ fechaRelativa(gasto.fechaProbablePago) }}
                  </span>
                </p>
                <div v-if="gasto.esRecurrente" class="flex items-center gap-1 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span class="text-[10px] text-theme-accent">Recurrente</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(gasto.montoEstimado) }}</p>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 transition-colors"
                :class="gasto.estado === 'pagado'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-orange-500/15 text-orange-400'"
              >
                {{ gasto.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}
              </span>
              <p v-if="gasto.gastoRegistradoFecha" class="mt-1 text-[10px] text-theme-text-sec">
                Registrado: {{ formatFecha(gasto.gastoRegistradoFecha) }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-x-3 mt-2 pt-2 border-t border-theme-border">
            <button
              v-if="gasto.estado === 'pendiente'"
              class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
              :title="esCategoriaAhorro(gasto) ? 'Registrar pago de ahorro' : 'Marcar como pagado con el monto estimado y la fecha de hoy'"
              @click="esCategoriaAhorro(gasto) ? emit('registrar', gasto) : marcarPagadoRapido(gasto)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Pagar
            </button>
            <button
              class="text-xs transition-colors flex items-center gap-1"
              :class="gasto.estado === 'pagado' ? 'text-emerald-400 hover:text-emerald-300' : 'text-orange-400 hover:text-orange-300'"
              @click="emit('registrar', gasto)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m-4-4h8" />
              </svg>
              {{ gasto.estado === 'pagado' ? 'Editar registro' : 'Registrar' }}
            </button>
            <button class="text-xs text-theme-text-muted hover:text-theme-accent transition-colors flex items-center gap-1" @click="emit('editar', gasto)">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button class="text-xs text-theme-text-muted hover:text-red-400 transition-colors flex items-center gap-1" @click="eliminarGasto(gasto)">
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
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="gastoParaEliminar = null"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Eliminar gasto recurrente</h3>
        <p class="text-sm text-theme-text-muted mb-5">Este gasto se repite en meses futuros. ¿Qué deseas hacer?</p>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors"
            @click="confirmarEliminar(true)"
          >
            Eliminar este y todos los futuros
          </button>
          <button
            class="w-full py-2.5 rounded-xl bg-theme-border-md text-theme-text-sec text-sm font-medium hover:bg-primary-600 transition-colors"
            @click="confirmarEliminar(false)"
          >
            Eliminar solo este mes
          </button>
          <button
            class="w-full py-2.5 rounded-xl text-theme-text-sec text-sm font-medium hover:text-theme-text-sec transition-colors"
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
const emit = defineEmits(['editar', 'registrar'])

const {
  gastosPorCategoria,
  gastosPlaneados,
  isLoading,
  deleteGastoPlaneado,
  softDeleteGastoPlaneado,
  updateGastoPlaneado,
} = usePlanificador()
const { success, show: toastShow } = useToast()

const filtroActual = ref('todos')
const busqueda = ref('')
const ordenActual = ref('fecha')

function hoyISO() {
  return useFechaPeru().fechaHoy()
}

function esVencido(gasto) {
  return gasto.estado === 'pendiente' && gasto.fechaProbablePago && gasto.fechaProbablePago < hoyISO()
}

function esHoyGasto(gasto) {
  return gasto.fechaProbablePago === hoyISO()
}

function diasDesdeHoy(fecha) {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha + 'T00:00:00')
  return Math.round((d - hoy) / 86400000)
}

function fechaRelativa(fecha) {
  if (!fecha) return ''
  const diff = diasDesdeHoy(fecha)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 1 && diff <= 7) return `En ${diff} días`
  if (diff < -1 && diff >= -30) return `Vencido hace ${Math.abs(diff)} días`
  const d = new Date(fecha + 'T00:00:00')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]}`
}

const ordenes = [
  { value: 'fecha', label: 'Fecha' },
  { value: 'monto', label: 'Monto' },
  { value: 'nombre', label: 'Nombre' },
]

const ordenLabel = computed(() => ordenes.find(o => o.value === ordenActual.value)?.label || 'Fecha')

function ciclarOrden() {
  const idx = ordenes.findIndex(o => o.value === ordenActual.value)
  ordenActual.value = ordenes[(idx + 1) % ordenes.length].value
}

function ordenarGastos(gastos) {
  const sorted = [...gastos]
  if (ordenActual.value === 'monto') {
    sorted.sort((a, b) => b.montoEstimado - a.montoEstimado)
  } else if (ordenActual.value === 'nombre') {
    sorted.sort((a, b) => a.concepto.localeCompare(b.concepto))
  } else {
    sorted.sort((a, b) => (a.fechaProbablePago || '').localeCompare(b.fechaProbablePago || ''))
  }
  return sorted
}

const filtros = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencido', label: 'Vencidos', accent: 'bg-red-500 text-white' },
  { value: 'hoy', label: 'Hoy', accent: 'bg-orange-500 text-white' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'pagado', label: 'Pagados', accent: 'bg-emerald-500 text-white' },
]

const filtrosConContador = computed(() => {
  const todos = gastosPlaneados.value
  return filtros.map(f => {
    let count = 0
    if (f.value === 'todos') count = todos.length
    else if (f.value === 'vencido') count = todos.filter(esVencido).length
    else if (f.value === 'hoy') count = todos.filter(g => esHoyGasto(g) && g.estado === 'pendiente').length
    else count = todos.filter(g => g.estado === f.value).length
    return { ...f, count }
  })
})

function pasaFiltro(gasto) {
  if (filtroActual.value === 'todos') return true
  if (filtroActual.value === 'vencido') return esVencido(gasto)
  if (filtroActual.value === 'hoy') return esHoyGasto(gasto) && gasto.estado === 'pendiente'
  return gasto.estado === filtroActual.value
}

const categoriasFiltered = computed(() => {
  const term = busqueda.value.trim().toLowerCase()
  const ordenaPorCategoria = ordenActual.value === 'fecha'

  if (ordenaPorCategoria) {
    // Agrupado por categoría (vista por defecto)
    return gastosPorCategoria.value
      .map(cat => {
        let gastos = cat.gastos
        if (filtroActual.value !== 'todos') {
          gastos = gastos.filter(pasaFiltro)
        }
        if (term) {
          gastos = gastos.filter(g => g.concepto.toLowerCase().includes(term))
        }
        gastos = ordenarGastos(gastos)
        return {
          ...cat,
          gastos,
          total: gastos.reduce((s, g) => s + g.montoEstimado, 0),
        }
      })
      .filter(cat => cat.gastos.length > 0)
  }

  // Para monto/nombre: lista plana en un solo grupo virtual
  let todosLosGastos = gastosPorCategoria.value.flatMap(cat =>
    cat.gastos.map(g => ({ ...g, _catNombre: cat.nombre, _catColor: cat.color }))
  )
  if (filtroActual.value !== 'todos') {
    todosLosGastos = todosLosGastos.filter(pasaFiltro)
  }
  if (term) {
    todosLosGastos = todosLosGastos.filter(g => g.concepto.toLowerCase().includes(term))
  }
  todosLosGastos = ordenarGastos(todosLosGastos)

  if (todosLosGastos.length === 0) return []
  return [{
    categoriaId: '__all',
    nombre: ordenActual.value === 'monto' ? 'Por monto' : 'Por nombre',
    color: '#6b7280',
    gastos: todosLosGastos,
    total: todosLosGastos.reduce((s, g) => s + g.montoEstimado, 0),
    totalReal: 0,
  }]
})

const { getCategoriaIcono } = useCategorias()

function getEmoji(nombre) {
  return getCategoriaIcono(nombre)
}

function esCategoriaAhorro(gasto) {
  const nombre = gasto.categoriaNombre || gasto._catNombre || ''
  return nombre.toLowerCase() === 'ahorro'
}

const { currencySymbol, formatMonto } = useCurrency()

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
    return
  }
  const handle = softDeleteGastoPlaneado(gasto.id, 5000)
  if (!handle) return
  toastShow({
    message: `"${gasto.concepto}" eliminado`,
    type: 'info',
    duration: 5000,
    action: {
      label: 'Deshacer',
      onClick: () => {
        if (handle.undo()) success('Restaurado')
      },
    },
  })
}

async function confirmarEliminar(incluirFuturos) {
  const gasto = gastoParaEliminar.value
  if (!gasto) return
  gastoParaEliminar.value = null
  await deleteGastoPlaneado(gasto.id, incluirFuturos)
}

async function marcarPagadoRapido(gasto) {
  try {
    await updateGastoPlaneado(gasto.id, { estado: 'pagado' })
    success(`"${gasto.concepto}" marcado como pagado`)
  } catch (e) {
    // error queda en composable
  }
}
</script>
