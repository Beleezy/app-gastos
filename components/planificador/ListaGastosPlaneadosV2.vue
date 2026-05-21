<!--
  ListaGastosPlaneadosV2 — rediseño del listado de gastos del Planificador.

  Cambios respecto a V1 (ListaGastosPlaneados.vue):
    • Filtros como chips de scroll horizontal (44px de alto) en lugar de
      panel colapsable. Búsqueda y orden separados.
    • Cards con jerarquía clara: avatar 48px + concepto/meta + monto/estado.
    • Acciones explícitas como chips de 36–44px (mejor tap target), swipe
      sigue disponible pero ya no es la única vía.
    • Categoría header con barra real/plan integrada y diferencia compacta.

  Misma lógica/contrato que V1: usePlanificador, useCategorias, useCurrency,
  useToast, useOverlayBack, useFechaPeru, useDebouncedRef.
  Mismo emits: ['editar', 'registrar'].
-->
<template>
  <div class="px-4 lg:px-0 py-3" data-testid="lista-planificados-v2">
    <!-- Barra superior: búsqueda + orden -->
    <div class="flex items-center gap-2 mb-3">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar..."
          class="w-full h-12 pl-10 pr-9 rounded-2xl bg-theme-card border border-theme-border text-theme-text placeholder-theme-text-muted text-sm focus:outline-none focus:border-theme-accent transition-colors"
        />
        <button v-if="busqueda" class="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted tap-44" @click="busqueda = ''">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        class="shrink-0 w-12 h-12 rounded-2xl bg-theme-card border border-theme-border text-theme-text-muted hover:bg-theme-border-md transition-colors flex items-center justify-center tap-44"
        :title="`Orden: ${ordenLabel}`"
        @click="ciclarOrden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      </button>
    </div>

    <!-- Chips de filtros (scroll horizontal, 44px) -->
    <div class="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
      <button
        v-for="f in filtrosConContador"
        :key="f.value"
        class="shrink-0 inline-flex items-center gap-2 px-4 h-11 rounded-full text-sm font-semibold transition-colors border tap-44"
        :class="[
          filtroActual === f.value
            ? (f.activeClass || 'bg-theme-accent text-theme-on-accent border-theme-accent')
            : 'bg-theme-card text-theme-text-sec border-theme-border',
          f.count === 0 && filtroActual !== f.value ? 'opacity-50' : ''
        ]"
        @click="filtroActual = f.value"
      >
        {{ f.label }}
        <span
          class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold"
          :class="filtroActual === f.value ? 'bg-black/15' : 'bg-theme-border-md/70 text-theme-text'"
        >{{ f.count }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-theme-card rounded-2xl p-4 animate-pulse">
        <div class="flex gap-3">
          <div class="w-12 h-12 rounded-xl bg-theme-border-md"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-theme-border-md rounded w-3/4"></div>
            <div class="h-3 bg-theme-border-md rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <SharedEmptyState
      v-else-if="categoriasFiltered.length === 0"
      icon="📋"
      title="No hay gastos planificados"
      message="Agrega tu primer gasto con el botón +"
    />

    <!-- Grupos por categoría -->
    <div v-else>
      <div v-for="cat in categoriasFiltered" :key="cat.categoriaId" class="mb-5">
        <button class="w-full flex items-center gap-3 mb-3 text-left" @click="toggleCategoria(cat.categoriaId)">
          <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: cat.color }"></span>
          <h3 class="text-sm font-bold text-theme-text uppercase tracking-wider flex-1">{{ cat.nombre }}</h3>
          <span class="text-xs text-theme-text-muted">{{ cat.gastos.length }} · {{ currencySymbol }} {{ formatMonto(cat.total) }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 text-theme-text-muted transition-transform shrink-0"
            :class="categoriaColapsada(cat.categoriaId) ? '-rotate-90' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <!-- Real vs plan -->
        <div v-if="cat.totalReal > 0 && !categoriaColapsada(cat.categoriaId)" class="ml-4 mb-3">
          <div class="flex items-center gap-2 mb-1">
            <div class="flex-1 h-1.5 bg-theme-input rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="cat.totalReal > cat.total ? 'bg-red-400' : 'bg-emerald-400'"
                :style="{ width: Math.min((cat.totalReal / cat.total) * 100, 100) + '%' }"
              ></div>
            </div>
            <span class="text-[11px] font-bold tabular-nums" :class="cat.totalReal > cat.total ? 'text-red-400' : 'text-emerald-400'">
              {{ currencySymbol }} {{ formatMonto(cat.totalReal) }}
            </span>
          </div>
          <p class="text-[11px]" :class="cat.totalReal > cat.total ? 'text-red-400' : 'text-emerald-400'">
            {{ cat.totalReal > cat.total ? '↑ Excede' : '↓ Ahorra' }} {{ currencySymbol }} {{ formatMonto(Math.abs(cat.totalReal - cat.total)) }}
          </p>
        </div>

        <template v-if="!categoriaColapsada(cat.categoriaId)">
          <div
            v-for="gasto in cat.gastos"
            :key="gasto.id"
            class="swipe-item-wrapper relative overflow-hidden rounded-2xl mb-2.5"
            data-testid="planificado-item"
          >
            <!-- Swipe backgrounds -->
            <div
              class="swipe-reveal-action swipe-bg-edit absolute inset-y-0 left-0 flex items-center pl-5"
              :class="(swipeOffsets[gasto.id] || 0) > 20 ? 'opacity-100' : 'opacity-0'"
            >
              <span class="flex items-center gap-2 text-theme-accent font-semibold text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Editar
              </span>
            </div>
            <div
              class="swipe-reveal-action swipe-bg-delete absolute inset-y-0 right-0 flex items-center pr-5"
              :class="(swipeOffsets[gasto.id] || 0) < -20 ? 'opacity-100' : 'opacity-0'"
            >
              <span class="flex items-center gap-2 text-red-400 font-semibold text-sm">
                Eliminar
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </span>
            </div>

            <!-- Card -->
            <div
              class="bg-theme-card rounded-2xl p-4 border-l-4 border border-theme-border transition-all"
              :class="
                gasto.estado === 'pagado' ? 'border-l-emerald-500' :
                esVencido(gasto) ? 'border-l-red-500' :
                esHoyGasto(gasto) && gasto.estado === 'pendiente' ? 'border-l-orange-500' :
                'border-l-orange-400/40'
              "
              :style="{ transform: `translateX(${swipeOffsets[gasto.id] || 0}px)`, transition: swipeDragging[gasto.id] ? 'none' : 'transform 0.25s ease' }"
              @touchstart.passive="onSwipeTouchStart($event, gasto.id)"
              @touchmove.passive="onSwipeTouchMove($event, gasto.id)"
              @touchend="onSwipeTouchEnd($event, gasto)"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
                  :style="{ backgroundColor: (gasto._catColor || cat.color) + '26' }"
                >{{ getEmoji(gasto._catNombre || cat.nombre) }}</div>

                <div class="flex-1 min-w-0">
                  <p class="text-base font-semibold text-theme-text truncate">{{ gasto.concepto }}</p>
                  <p class="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                    <span
                      class="inline-flex items-center gap-1 font-medium"
                      :class="esVencido(gasto) ? 'text-red-400' : (esHoyGasto(gasto) && gasto.estado === 'pendiente' ? 'text-orange-400' : 'text-theme-text-muted')"
                      :title="formatFecha(gasto.fechaProbablePago)"
                    >
                      <svg v-if="esVencido(gasto)" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
                      </svg>
                      {{ fechaRelativa(gasto.fechaProbablePago) }}
                    </span>
                    <span v-if="gasto.esRecurrente" class="inline-flex items-center gap-1 text-theme-accent">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Recurrente
                    </span>
                  </p>
                </div>

                <div class="text-right shrink-0">
                  <p class="text-base font-bold text-theme-text tabular-nums">
                    {{ currencySymbol }} {{ formatMonto(gasto.montoEstimado) }}
                  </p>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1"
                    :class="gasto.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : esVencido(gasto) ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400'"
                  >
                    {{ gasto.estado === 'pagado' ? 'Pagado' : esVencido(gasto) ? 'Atrasado' : 'Pendiente' }}
                  </span>
                </div>
              </div>

              <!-- Acciones como chips -->
              <div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-theme-border">
                <button
                  v-if="gasto.estado === 'pendiente'"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 active:scale-95 transition-all tap-44"
                  data-testid="btn-marcar-pagado"
                  @click="esCategoriaAhorro(gasto) ? emit('registrar', gasto) : marcarPagadoRapido(gasto)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Pagar
                </button>
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-80 active:scale-95 transition-all tap-44"
                  :class="gasto.gastoRegistradoFecha ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'"
                  @click="emit('registrar', gasto)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m-4-4h8" />
                  </svg>
                  {{ gasto.gastoRegistradoFecha ? 'Editar registro' : 'Registrar' }}
                </button>
                <button
                  class="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-input text-theme-text-sec text-xs font-semibold hover:bg-theme-border-md active:scale-95 transition-all tap-44"
                  data-testid="btn-editar-planificado"
                  @click="emit('editar', gasto)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <button
                  class="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all tap-44"
                  data-testid="btn-eliminar-planificado"
                  aria-label="Eliminar"
                  @click="pedirConfirmarEliminar(gasto)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="h-16"></div>
    </div>

    <!-- Confirms (idénticos a V1) -->
    <SharedConfirmDialog
      v-model="showConfirmSimple"
      title="Eliminar gasto"
      :message="gastoParaEliminar ? `¿Eliminar &quot;${gastoParaEliminar.concepto}&quot;? Tendrás 5 segundos para deshacer.` : ''"
      confirm-label="Eliminar"
      variant="danger"
      @confirm="ejecutarEliminarSimple"
    >
      <template #message>
        <p>¿Eliminar "{{ gastoParaEliminar?.concepto }}"? Tendrás 5 segundos para deshacer.</p>
        <p v-if="gastoParaEliminar?.gastoRegistradoFecha" class="mt-3 text-[15px] font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
          ⚠️ Advertencia: Este gasto ya ha sido registrado. También se eliminará del registro.
        </p>
      </template>
    </SharedConfirmDialog>

    <div v-if="showModalRecurrente && gastoParaEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="gastoParaEliminar = null; showModalRecurrente = false"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Eliminar gasto recurrente</h3>
        <div class="text-sm text-theme-text-muted mb-5">
          Este gasto se repite en meses futuros. ¿Qué deseas hacer?
        </div>
        <div class="space-y-2">
          <button class="w-full py-3 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 tap-44 transition-colors" @click="confirmarEliminar(true)">
            Eliminar este y todos los futuros
          </button>
          <button class="w-full py-3 rounded-xl bg-theme-border-md text-theme-text-sec text-sm font-medium hover:bg-primary-600 tap-44 transition-colors" @click="confirmarEliminar(false)">
            Eliminar solo este mes
          </button>
          <button class="w-full py-3 rounded-xl text-theme-text-sec text-sm font-medium tap-44 transition-colors" @click="gastoParaEliminar = null; showModalRecurrente = false">
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
  gastosPorCategoria, gastosPlaneados, isLoading,
  deleteGastoPlaneado, softDeleteGastoPlaneado, updateGastoPlaneado,
} = usePlanificador()
const { success, show: toastShow } = useToast()

const filtroActual = ref('todos')
const busqueda = ref('')
const busquedaDebounced = useDebouncedRef(busqueda, 200)
const ordenActual = ref('fecha')
const categoriasColapsadas = ref(new Set())

function toggleCategoria(categoriaId) {
  const next = new Set(categoriasColapsadas.value)
  if (next.has(categoriaId)) next.delete(categoriaId)
  else next.add(categoriaId)
  categoriasColapsadas.value = next
}
function categoriaColapsada(id) { return categoriasColapsadas.value.has(id) }

function hoyISO() { return useFechaPeru().fechaHoy() }
function esVencido(g) { return g.estado === 'pendiente' && g.fechaProbablePago && g.fechaProbablePago < hoyISO() }
function esHoyGasto(g) { return g.fechaProbablePago === hoyISO() }

function diasDesdeHoy(fecha) {
  if (!fecha) return null
  const h = new Date(); h.setHours(0, 0, 0, 0)
  const d = new Date(fecha + 'T00:00:00')
  return Math.round((d - h) / 86400000)
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

function ordenarGastos(g) {
  const s = [...g]
  if (ordenActual.value === 'monto') s.sort((a, b) => b.montoEstimado - a.montoEstimado)
  else if (ordenActual.value === 'nombre') s.sort((a, b) => a.concepto.localeCompare(b.concepto))
  else s.sort((a, b) => (a.fechaProbablePago || '').localeCompare(b.fechaProbablePago || ''))
  return s
}

const filtros = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencido', label: '⚠ Vencidos', activeClass: 'bg-red-500 text-white border-red-500' },
  { value: 'hoy', label: 'Hoy', activeClass: 'bg-orange-500 text-white border-orange-500' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'pagado', label: 'Pagados', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
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

function pasaFiltro(g) {
  if (filtroActual.value === 'todos') return true
  if (filtroActual.value === 'vencido') return esVencido(g)
  if (filtroActual.value === 'hoy') return esHoyGasto(g) && g.estado === 'pendiente'
  return g.estado === filtroActual.value
}

const categoriasFiltered = computed(() => {
  const term = (busquedaDebounced.value || '').trim().toLowerCase()
  const ordenaPorCategoria = ordenActual.value === 'fecha'
  if (ordenaPorCategoria) {
    return gastosPorCategoria.value.map(cat => {
      let gastos = cat.gastos
      if (filtroActual.value !== 'todos') gastos = gastos.filter(pasaFiltro)
      if (term) gastos = gastos.filter(g => g.concepto.toLowerCase().includes(term))
      gastos = ordenarGastos(gastos)
      return { ...cat, gastos, total: gastos.reduce((s, g) => s + g.montoEstimado, 0) }
    }).filter(c => c.gastos.length > 0)
  }
  let todos = gastosPorCategoria.value.flatMap(cat =>
    cat.gastos.map(g => ({ ...g, _catNombre: cat.nombre, _catColor: cat.color }))
  )
  if (filtroActual.value !== 'todos') todos = todos.filter(pasaFiltro)
  if (term) todos = todos.filter(g => g.concepto.toLowerCase().includes(term))
  todos = ordenarGastos(todos)
  if (!todos.length) return []
  return [{ categoriaId: '__all', nombre: ordenActual.value === 'monto' ? 'Por monto' : 'Por nombre', color: '#6b7280', gastos: todos, total: todos.reduce((s, g) => s + g.montoEstimado, 0), totalReal: 0 }]
})

const { getCategoriaIcono } = useCategorias()
function getEmoji(nombre) { return getCategoriaIcono(nombre) }
function esCategoriaAhorro(g) {
  const nombre = g.categoriaNombre || g._catNombre || ''
  return nombre.toLowerCase() === 'ahorro'
}

const { currencySymbol, formatMonto } = useCurrency()

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`
}

const gastoParaEliminar = ref(null)
const showConfirmSimple = ref(false)
const showModalRecurrente = ref(false)
const isEliminarOpen = computed(() => gastoParaEliminar.value !== null)
useOverlayBack(isEliminarOpen, () => { gastoParaEliminar.value = null; showConfirmSimple.value = false; showModalRecurrente.value = false })

function pedirConfirmarEliminar(g) {
  gastoParaEliminar.value = g
  if (g.esRecurrente && g.recurrenteGrupoId) showModalRecurrente.value = true
  else showConfirmSimple.value = true
}
function eliminarGasto(g) { pedirConfirmarEliminar(g) }

function ejecutarEliminarSimple() {
  const g = gastoParaEliminar.value
  if (!g) return
  showConfirmSimple.value = false
  gastoParaEliminar.value = null
  const handle = softDeleteGastoPlaneado(g.id, 5000)
  if (!handle) return
  toastShow({
    message: `"${g.concepto}" eliminado`, type: 'info', duration: 5000,
    action: { label: 'Deshacer', onClick: () => { if (handle.undo()) success('Restaurado') } },
  })
}

async function confirmarEliminar(incluirFuturos) {
  const g = gastoParaEliminar.value
  if (!g) return
  showModalRecurrente.value = false
  gastoParaEliminar.value = null
  await deleteGastoPlaneado(g.id, incluirFuturos)
}

async function marcarPagadoRapido(g) {
  try {
    await updateGastoPlaneado(g.id, { estado: 'pagado' })
    success(`"${g.concepto}" marcado como pagado`)
  } catch { /* error en composable */ }
}

const SWIPE_THRESHOLD = 70
const MAX_SWIPE = 110
const swipeOffsets = reactive({})
const swipeDragging = reactive({})
const swipeBlockFlags = reactive({})
const swipeStartX = {}
const swipeStartY = {}

function onSwipeTouchStart(e, id) {
  const t = e.touches[0]
  swipeStartX[id] = t.clientX
  swipeStartY[id] = t.clientY
  swipeDragging[id] = true
  swipeBlockFlags[id] = false
}
function onSwipeTouchMove(e, id) {
  if (!swipeDragging[id] || swipeBlockFlags[id]) return
  const t = e.touches[0]
  const dx = t.clientX - swipeStartX[id]
  const dy = t.clientY - swipeStartY[id]
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
    swipeBlockFlags[id] = true
    swipeOffsets[id] = 0
    return
  }
  swipeOffsets[id] = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, dx))
}
function onSwipeTouchEnd(e, gasto) {
  const id = gasto.id
  if (!swipeDragging[id]) { swipeOffsets[id] = 0; return }
  swipeDragging[id] = false
  const offset = swipeOffsets[id] || 0
  swipeOffsets[id] = 0
  if (swipeBlockFlags[id]) return
  if (offset <= -SWIPE_THRESHOLD) eliminarGasto(gasto)
  else if (offset >= SWIPE_THRESHOLD) emit('editar', gasto)
}
</script>

<style scoped>
.swipe-item-wrapper { touch-action: pan-y; }
.swipe-reveal-action { transition: opacity 0.2s ease; }
.swipe-bg-edit { background: linear-gradient(to right, rgba(99, 102, 241, 0.15), transparent); }
.swipe-bg-delete { background: linear-gradient(to left, rgba(239, 68, 68, 0.15), transparent); }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; }
</style>
