<template>
  <div class="px-4" data-no-month-swipe data-testid="historial-diario">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="space-y-1.5">
        <div class="bg-theme-card rounded-xl h-14 shimmer border border-theme-border"></div>
        <div v-if="i === 1" class="ml-4 space-y-1.5">
          <div v-for="j in 2" :key="j" class="bg-theme-card rounded-xl h-12 shimmer border border-theme-border opacity-70"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="sinDatos" class="flex flex-col items-center py-10">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-theme-card/80 to-theme-card/40 flex items-center justify-center mb-4 border border-theme-border">
        <span class="text-3xl opacity-40">📝</span>
      </div>
      <p class="text-sm text-theme-text-muted font-medium">No hay gastos este mes</p>
      <p class="text-xs text-theme-text-muted mt-1.5 mb-5">Registra tu primer gasto</p>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-theme-accent-bg text-theme-accent border border-theme-accent active:scale-95 transition-all"
          @click="$emit('request-voice')"
        >
          <span>🎤</span> Dictar
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-theme-card text-theme-text border border-theme-border active:scale-95 transition-all"
          @click="$emit('request-manual')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Manual
        </button>
      </div>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Toggle solo si ambas vistas están activas -->
      <SharedTabBar
        v-if="ambasVistas"
        :model-value="vistaActiva"
        :tabs="vistasTabs"
        variant="card"
        size="md"
        aria-label="Vista de historial"
        container-class="grid grid-cols-2 gap-2 mb-4"
        @change="cambiarVista"
      />

      <!-- Vista por semana -->
      <div v-if="mostrarSemana" class="space-y-3" :class="{ 'mb-6': ambasVistas && vistaActiva === 'semana' }">
        <div v-for="semana in gastosPorSemana" :key="semana.key">
          <button
            class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
            :class="semanaExpandida === semana.key ? 'bg-theme-accent-bg border border-theme-accent shadow-sm' : 'bg-theme-card border border-theme-border hover:bg-theme-card'"
            @click="toggleSemana(semana.key)"
          >
            <div class="text-left">
              <p class="text-sm font-medium text-theme-text">{{ formatRangoSemana(semana.desde, semana.hasta) }}</p>
              <p class="text-xs text-theme-text-sec">{{ semana.dias.length }} {{ semana.dias.length === 1 ? 'dia' : 'dias' }} con gastos</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-theme-accent">{{ currencySymbol }}&nbsp;{{ formatMonto(semana.total) }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-sec transition-transform"
                :class="{ 'rotate-180': semanaExpandida === semana.key }"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <Transition name="expand">
            <div v-if="semanaExpandida === semana.key" class="ml-2 mt-1 space-y-1.5">
              <div v-for="dia in semana.dias" :key="dia.fecha">
                <button
                  class="w-full px-3 py-2 rounded-lg transition-colors"
                  :class="diasExpandidos.has(dia.fecha) ? 'bg-theme-border-md border border-theme-border' : 'bg-theme-card hover:bg-theme-card'"
                  @click.stop="onSemDayClick(dia)"
                  @contextmenu.prevent="activarSeleccionDia(dia)"
                >
                  <div class="flex items-center gap-2.5">
                    <!-- En modo selección, el bloque del día también funciona
                         como checkbox del día completo (vista por semana). -->
                    <span
                      v-if="seleccionActiva"
                      class="relative w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 border-2 transition-colors"
                      :class="estadoSeleccionDia(dia) === 'all'
                        ? 'bg-theme-accent border-theme-accent text-theme-on-accent'
                        : estadoSeleccionDia(dia) === 'some'
                          ? 'bg-theme-accent-bg border-theme-accent text-theme-accent'
                          : 'bg-theme-card border-theme-border-md text-theme-text-muted'"
                      role="checkbox"
                      :aria-checked="estadoSeleccionDia(dia) === 'all' ? 'true' : estadoSeleccionDia(dia) === 'some' ? 'mixed' : 'false'"
                      aria-label="Seleccionar todos los gastos del día"
                      @click.stop="toggleSelectDia(dia)"
                    >
                      <span class="text-[0.625rem] uppercase leading-none font-semibold">{{ nombreDiaSemana(dia.fecha) }}</span>
                      <span class="text-xs font-bold leading-tight">{{ extraerDia(dia.fecha) }}</span>
                      <span
                        v-if="estadoSeleccionDia(dia) !== 'none'"
                        class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-theme-accent text-theme-on-accent flex items-center justify-center text-[0.6875rem] font-bold leading-none shadow"
                      >{{ estadoSeleccionDia(dia) === 'all' ? '✓' : '−' }}</span>
                    </span>
                    <div v-else class="w-9 h-9 rounded-lg flex flex-col items-center justify-center bg-theme-card border border-theme-border shrink-0">
                      <span class="text-[0.625rem] uppercase leading-none font-semibold text-theme-text-muted">{{ nombreDiaSemana(dia.fecha) }}</span>
                      <span class="text-xs font-bold text-theme-text leading-tight">{{ extraerDia(dia.fecha) }}</span>
                    </div>
                    <div class="flex-1 min-w-0 text-left">
                      <div class="flex items-center justify-between gap-2">
                        <!-- Día abreviado (Mié 10): el nombre completo se truncaba
                             ("Miérc...") a 380px con texto grande -->
                        <p class="text-xs font-medium text-theme-text-sec truncate">
                          {{ nombreDiaSemana(dia.fecha) }} {{ extraerDia(dia.fecha) }}
                          <span class="text-theme-text-muted font-normal">· {{ formatRelativo(dia.fecha) }}</span>
                        </p>
                        <span class="text-sm font-semibold text-theme-text shrink-0">{{ currencySymbol }}&nbsp;{{ formatMonto(dia.total) }}</span>
                      </div>
                      <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span class="text-[0.6875rem] text-theme-text-muted leading-none">{{ dia.gastos.length }} {{ dia.gastos.length === 1 ? 'gasto' : 'gastos' }}</span>
                        <span v-if="getStats(dia).topCat" class="text-[0.6875rem] px-1 py-0.5 rounded leading-none font-medium"
                          :style="{ backgroundColor: getStats(dia).topCat.color + '20', color: getStats(dia).topCat.color }"
                        >
                          {{ getStats(dia).topCat.icono }} {{ getStats(dia).topCat.nombre }}
                        </span>
                        <span v-if="getStats(dia).rangoHoras" class="text-[0.6875rem] text-theme-text-muted leading-none">· {{ getStats(dia).rangoHoras }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span
                        v-if="!seleccionActiva"
                        class="tap-target w-6 h-6 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent-bg active:scale-90 transition-all"
                        role="button"
                        tabindex="0"
                        aria-label="Seleccionar gastos del día"
                        @click.stop="activarSeleccionDia(dia)"
                        @keydown.enter.stop.prevent="activarSeleccionDia(dia)"
                        @keydown.space.stop.prevent="activarSeleccionDia(dia)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-theme-text-muted transition-transform shrink-0"
                        :class="{ 'rotate-180': diasExpandidos.has(dia.fecha) }"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                <Transition name="expand">
                  <TransitionGroup v-if="diasExpandidos.has(dia.fecha)" name="gasto-in" tag="div" class="ml-6 mt-1 space-y-1.5">
                    <RegistroGastoItem
                      v-for="gasto in dia.gastos"
                      :key="gasto.id"
                      data-testid="gasto-item"
                      :gasto="gasto"
                      :selectable="seleccionActiva"
                      :selected="selectedIds.has(gasto.id)"
                      @edit="$emit('edit', gasto)"
                      @delete="$emit('delete', gasto)"
                      @duplicate="$emit('duplicate', gasto)"
                      @toggle-select="toggleSelect(gasto)"
                      @long-press="onItemLongPress(gasto)"
                    />
                  </TransitionGroup>
                </Transition>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Vista por día -->
      <div v-if="mostrarDia" class="space-y-2">
        <div v-for="dia in gastosPorDia" :key="dia.fecha">
          <button
            class="w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
            :class="diasExpandidos.has(dia.fecha) ? 'bg-theme-accent-bg border border-theme-accent shadow-sm' : 'bg-theme-card border border-theme-border hover:bg-theme-card'"
            @click="onDayHeaderClick(dia)"
            @contextmenu.prevent="activarSeleccionDia(dia)"
          >
            <div class="flex items-center gap-3">
              <!-- En modo selección, el bloque del día (MIE 20) actúa como
                   checkbox del día completo: marca/desmarca todos sus gastos. -->
              <span
                v-if="seleccionActiva"
                class="relative w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border-2 transition-colors"
                :class="estadoSeleccionDia(dia) === 'all'
                  ? 'bg-theme-accent border-theme-accent text-theme-on-accent'
                  : estadoSeleccionDia(dia) === 'some'
                    ? 'bg-theme-accent-bg border-theme-accent text-theme-accent'
                    : 'bg-theme-card border-theme-border-md text-theme-text-muted'"
                role="checkbox"
                :aria-checked="estadoSeleccionDia(dia) === 'all' ? 'true' : estadoSeleccionDia(dia) === 'some' ? 'mixed' : 'false'"
                aria-label="Seleccionar todos los gastos del día"
                @click.stop="toggleSelectDia(dia)"
              >
                <span class="text-[0.6875rem] uppercase leading-none font-semibold">{{ nombreDiaSemana(dia.fecha) }}</span>
                <span class="text-base font-bold leading-tight">{{ extraerDia(dia.fecha) }}</span>
                <span
                  v-if="estadoSeleccionDia(dia) !== 'none'"
                  class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-theme-accent text-theme-on-accent flex items-center justify-center text-[0.6875rem] font-bold leading-none shadow"
                >{{ estadoSeleccionDia(dia) === 'all' ? '✓' : '−' }}</span>
              </span>
              <div
                v-else
                class="w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-colors shrink-0"
                :class="diasExpandidos.has(dia.fecha) ? 'bg-theme-accent-bg border border-theme-accent/30' : 'bg-theme-border-md'"
              >
                <span class="text-[0.6875rem] uppercase leading-none font-semibold" :class="diasExpandidos.has(dia.fecha) ? 'text-theme-accent' : 'text-theme-text-muted'">{{ nombreDiaSemana(dia.fecha) }}</span>
                <span class="text-base font-bold leading-tight" :class="diasExpandidos.has(dia.fecha) ? 'text-theme-accent' : 'text-theme-text'">{{ extraerDia(dia.fecha) }}</span>
              </div>
              <div class="flex-1 min-w-0 text-left">
                <div class="flex items-center justify-between gap-2">
                  <!-- Día abreviado: "Miércoles 10" se truncaba a 380px con texto grande -->
                  <p class="text-sm font-semibold text-theme-text truncate">{{ nombreDiaSemana(dia.fecha) }} {{ extraerDia(dia.fecha) }}</p>
                  <span class="text-sm font-bold text-theme-text shrink-0">{{ currencySymbol }}&nbsp;{{ formatMonto(dia.total) }}</span>
                </div>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span class="text-[0.6875rem] px-1.5 py-0.5 rounded-md bg-theme-border-md text-theme-text-sec leading-none font-medium">
                    {{ dia.gastos.length }} {{ dia.gastos.length === 1 ? 'gasto' : 'gastos' }}
                  </span>
                  <span v-if="getStats(dia).topCat" class="text-[0.6875rem] px-1.5 py-0.5 rounded-md leading-none font-medium"
                    :style="{ backgroundColor: getStats(dia).topCat.color + '20', color: getStats(dia).topCat.color }"
                  >
                    {{ getStats(dia).topCat.icono }} {{ getStats(dia).topCat.nombre }}
                  </span>
                  <span class="text-[0.6875rem] text-theme-text-muted leading-none">
                    Prom. {{ currencySymbol }}&nbsp;{{ formatMonto(getStats(dia).promedio) }}
                  </span>
                  <span v-if="getStats(dia).rangoHoras" class="text-[0.6875rem] text-theme-text-muted leading-none">
                    · {{ getStats(dia).rangoHoras }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <span
                  v-if="!seleccionActiva"
                  class="w-7 h-7 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent-bg active:scale-90 transition-all"
                  role="button"
                  aria-label="Seleccionar gastos"
                  @click.stop="activarSeleccionDia(dia)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-sec transition-transform"
                  :class="{ 'rotate-180': diasExpandidos.has(dia.fecha) }"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>

          <Transition name="expand">
            <TransitionGroup v-if="diasExpandidos.has(dia.fecha)" name="gasto-in" tag="div" class="ml-4 mt-1 space-y-1.5">
              <RegistroGastoItem
                v-for="gasto in dia.gastos"
                :key="gasto.id"
                data-testid="gasto-item"
                :gasto="gasto"
                :selectable="seleccionActiva"
                :selected="selectedIds.has(gasto.id)"
                @edit="$emit('edit', gasto)"
                @delete="$emit('delete', gasto)"
                @duplicate="$emit('duplicate', gasto)"
                @toggle-select="toggleSelect(gasto)"
                @long-press="onItemLongPress(gasto)"
              />
            </TransitionGroup>
          </Transition>
        </div>
      </div>
    </template>

    <!-- Barra flotante de selección -->
    <Transition name="selection-bar">
      <div v-if="seleccionActiva"
        class="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 flex items-center gap-2 bg-theme-card border border-theme-border shadow-xl shadow-black/40 backdrop-blur-sm rounded-2xl px-3 py-2.5 max-w-[calc(100%-1.5rem)]"
      >
        <button
          class="w-8 h-8 rounded-lg bg-theme-border-md text-theme-text-muted hover:text-theme-text flex items-center justify-center active:scale-90 transition-all shrink-0"
          aria-label="Cancelar seleccion"
          @click="cancelarSeleccion"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div class="flex flex-col min-w-0 shrink">
          <span class="text-[0.6875rem] text-theme-text-sec leading-none">Seleccionados</span>
          <span class="text-xs font-bold text-theme-text leading-tight">{{ selectedIds.size }} gasto{{ selectedIds.size === 1 ? '' : 's' }}</span>
        </div>
        <button
          class="px-2.5 py-1.5 rounded-lg bg-theme-border-md text-theme-text-sec text-[0.6875rem] font-medium hover:text-theme-text transition-colors whitespace-nowrap shrink-0"
          @click="toggleSelectAllDia"
        >
          {{ todosSeleccionadosEnDia ? 'Cancelar' : 'Todo dia' }}
        </button>
        <!-- Editar: solo ícono en móvil, texto en desktop -->
        <button
          class="py-1.5 rounded-lg bg-theme-accent-bg text-theme-accent font-semibold hover:bg-theme-accent-bg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
          :class="selectedIds.size === 0 ? 'px-2.5 cursor-not-allowed' : 'px-2.5 lg:px-3'"
          :disabled="selectedIds.size === 0"
          aria-label="Editar seleccionados"
          @click="solicitarBulkEdit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span class="hidden lg:inline text-[0.6875rem]">Editar</span>
        </button>
        <!-- Eliminar: solo ícono en móvil, texto en desktop -->
        <button
          class="py-1.5 rounded-lg bg-red-500/15 text-red-400 font-semibold hover:bg-red-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
          :class="selectedIds.size === 0 ? 'px-2.5 cursor-not-allowed' : 'px-2.5 lg:px-3'"
          :disabled="selectedIds.size === 0"
          aria-label="Eliminar seleccionados"
          @click="solicitarBulkDelete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="hidden lg:inline text-[0.6875rem]">Eliminar</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  gastosPorDia: { type: Array, default: () => [] },
  gastosPorSemana: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  formatFechaDia: { type: Function, required: true },
  formatRangoSemana: { type: Function, required: true },
  mostrarVistaDia: { type: Boolean, default: true },
  mostrarVistaSemana: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'delete', 'duplicate', 'request-voice', 'request-manual', 'bulk-delete', 'bulk-edit', 'seleccion-activa'])

const { vibrate } = useHaptic()
const { formatRelativo } = useFechaRelativa()

// Determinar qué vistas mostrar
const ambasVistas = computed(() => props.mostrarVistaDia && props.mostrarVistaSemana)
const soloSemana = computed(() => props.mostrarVistaSemana && !props.mostrarVistaDia)
const soloDia = computed(() => props.mostrarVistaDia && !props.mostrarVistaSemana)

// Vista activa cuando ambas están habilitadas (toggle)
const vistaActiva = ref('dia')

const vistasTabs = [
  { value: 'semana', label: 'Por semana' },
  { value: 'dia', label: 'Por día' },
]

// Qué vista se renderiza ahora
const mostrarDia = computed(() => {
  if (soloDia.value) return true
  if (soloSemana.value) return false
  return vistaActiva.value === 'dia'
})

const mostrarSemana = computed(() => {
  if (soloSemana.value) return true
  if (soloDia.value) return false
  return vistaActiva.value === 'semana'
})

// ─── Selección múltiple ─────────────────────────────────
const seleccionActiva = ref(false)
const selectedIds = ref(new Set())
const diaSeleccionActual = ref(null)

const gastosDelDiaActual = computed(() => {
  if (!diaSeleccionActual.value) return []
  const dia = props.gastosPorDia.find(d => d.fecha === diaSeleccionActual.value)
  if (dia) return dia.gastos || []
  // Buscar en semanas también
  for (const sem of props.gastosPorSemana) {
    const d = sem.dias.find(d => d.fecha === diaSeleccionActual.value)
    if (d) return d.gastos || []
  }
  return []
})

const todosSeleccionadosEnDia = computed(() => {
  const gastos = gastosDelDiaActual.value
  if (!gastos.length) return false
  return gastos.every(g => selectedIds.value.has(g.id))
})

function activarSeleccionDia(dia) {
  vibrate([15, 30, 15])
  seleccionActiva.value = true
  emit('seleccion-activa', true)
  diaSeleccionActual.value = dia.fecha
  const nuevo = new Set(diasExpandidos.value)
  nuevo.add(dia.fecha)
  diasExpandidos.value = nuevo
  selectedIds.value = new Set(dia.gastos.map(g => g.id))
}

function cancelarSeleccion() {
  vibrate(10)
  seleccionActiva.value = false
  emit('seleccion-activa', false)
  selectedIds.value = new Set()
  diaSeleccionActual.value = null
}

function toggleSelect(gasto) {
  const nueva = new Set(selectedIds.value)
  if (nueva.has(gasto.id)) nueva.delete(gasto.id)
  else nueva.add(gasto.id)
  selectedIds.value = nueva
  if (nueva.size === 0) cancelarSeleccion()
}

// ─── Checkbox por día (bloque MIE 20) ───────────────────
// 'all' | 'some' | 'none' según cuántos gastos del día están marcados.
function estadoSeleccionDia(dia) {
  const gastos = dia.gastos || []
  if (!gastos.length) return 'none'
  const marcados = gastos.filter(g => selectedIds.value.has(g.id)).length
  return marcados === 0 ? 'none' : marcados === gastos.length ? 'all' : 'some'
}

// Tocar el bloque del día marca/desmarca todos sus gastos de una vez.
function toggleSelectDia(dia) {
  vibrate(10)
  const gastos = dia.gastos || []
  if (!gastos.length) return
  const nueva = new Set(selectedIds.value)
  if (estadoSeleccionDia(dia) === 'all') {
    for (const g of gastos) nueva.delete(g.id)
  } else {
    for (const g of gastos) nueva.add(g.id)
  }
  selectedIds.value = nueva
  if (nueva.size === 0) cancelarSeleccion()
}

function onItemLongPress(gasto) {
  if (seleccionActiva.value) return
  vibrate([20, 40, 20])
  seleccionActiva.value = true
  emit('seleccion-activa', true)
  diaSeleccionActual.value = gasto.fecha
  selectedIds.value = new Set([gasto.id])
}

function toggleSelectAllDia() {
  const gastos = gastosDelDiaActual.value
  if (!gastos.length) return
  if (todosSeleccionadosEnDia.value) {
    const nueva = new Set(selectedIds.value)
    for (const g of gastos) nueva.delete(g.id)
    selectedIds.value = nueva
    if (nueva.size === 0) cancelarSeleccion()
  } else {
    const nueva = new Set(selectedIds.value)
    for (const g of gastos) nueva.add(g.id)
    selectedIds.value = nueva
  }
}

function solicitarBulkDelete() {
  if (selectedIds.value.size === 0) return
  const ids = [...selectedIds.value]
  emit('bulk-delete', {
    ids,
    count: ids.length,
    onDone: () => {
      cancelarSeleccion()
    },
  })
}

function solicitarBulkEdit() {
  if (selectedIds.value.size === 0) return
  const ids = [...selectedIds.value]
  emit('bulk-edit', {
    ids,
    count: ids.length,
    onDone: () => {
      cancelarSeleccion()
    },
  })
}

function onDayHeaderClick(dia) {
  if (seleccionActiva.value && diaSeleccionActual.value === dia.fecha) return
  toggleDia(dia.fecha)
}

function onSemDayClick(dia) {
  if (seleccionActiva.value && diaSeleccionActual.value === dia.fecha) return
  toggleDia(dia.fecha)
}

const hoy = useFechaPeru().fechaHoy()

const diasExpandidos = ref(new Set())
const semanaExpandida = ref(null)

// Expandir por defecto: "hoy" si existe, si no, el primer día
const diaInicializado = ref(false)
watch(() => props.gastosPorDia, (dias) => {
  if (diaInicializado.value || !dias.length) return
  const tieneHoy = dias.some(d => d.fecha === hoy)
  diasExpandidos.value = new Set([tieneHoy ? hoy : dias[0].fecha])
  diaInicializado.value = true
}, { immediate: true })

// Auto-expandir semana actual o primera
const semanaInicializada = ref(false)
watch(() => props.gastosPorSemana, (semanas) => {
  if (semanaInicializada.value || !semanas.length) return
  const semanaHoy = semanas.find(s => s.desde <= hoy && hoy <= s.hasta)
  semanaExpandida.value = semanaHoy ? semanaHoy.key : semanas[0].key
  semanaInicializada.value = true
}, { immediate: true })

const sinDatos = computed(() => props.gastosPorDia.length === 0 && props.gastosPorSemana.length === 0)

function cambiarVista(v) {
  vibrate(10)
  vistaActiva.value = v
  // Limpiar selección al cambiar vista
  if (seleccionActiva.value) cancelarSeleccion()
}

function toggleDia(fecha) {
  vibrate(8)
  const nuevo = new Set(diasExpandidos.value)
  if (nuevo.has(fecha)) nuevo.delete(fecha)
  else nuevo.add(fecha)
  diasExpandidos.value = nuevo
}

function toggleSemana(key) {
  vibrate(8)
  semanaExpandida.value = semanaExpandida.value === key ? null : key
  if (semanaExpandida.value !== key) diasExpandidos.value = new Set()
}

function extraerDia(fechaStr) {
  return parseInt(fechaStr.split('-')[2])
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
function nombreDiaSemana(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}

const ICON_MAP = {
  'utensils': '🍽️', 'bus': '🚌', 'home': '🏠', 'heart-pulse': '🏥',
  'graduation-cap': '📚', 'gamepad': '🎮', 'shirt': '👕', 'zap': '⚡',
  'piggy-bank': '💰', 'credit-card': '💳', 'circle-dot': '📦',
}
function resolveIcono(icono) {
  if (!icono) return '📦'
  if (icono.charCodeAt(0) > 255) return icono
  return ICON_MAP[icono] || '📦'
}

function formatHoraCorta(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m}${ampm}`
}

// Memoización de statsDia
const statsCache = new Map()
function cacheKey(dia) {
  return `${dia.fecha}|${dia.gastos.length}|${dia.total}`
}
function computeStatsDia(dia) {
  const gastos = dia.gastos || []
  if (!gastos.length) return { topCat: null, promedio: 0, rangoHoras: '' }
  const porCat = new Map()
  for (const g of gastos) {
    const key = g.categoriaId || g.categoriaNombre || 'otros'
    const acc = porCat.get(key) || {
      total: 0,
      nombre: g.categoriaNombre || 'Otros',
      color: g.categoriaColor || '#6b7280',
      icono: resolveIcono(g.categoriaIcono),
    }
    acc.total += Number(g.monto) || 0
    porCat.set(key, acc)
  }
  let topCat = null
  for (const c of porCat.values()) {
    if (!topCat || c.total > topCat.total) topCat = c
  }
  const promedio = dia.total / gastos.length
  const horas = gastos.map(g => g.hora).filter(Boolean).sort()
  let rangoHoras = ''
  if (horas.length >= 2) rangoHoras = `${formatHoraCorta(horas[0])}–${formatHoraCorta(horas[horas.length - 1])}`
  else if (horas.length === 1) rangoHoras = formatHoraCorta(horas[0])
  return { topCat, promedio, rangoHoras }
}
function getStats(dia) {
  const key = cacheKey(dia)
  if (statsCache.has(key)) return statsCache.get(key)
  const result = computeStatsDia(dia)
  statsCache.set(key, result)
  if (statsCache.size > 200) {
    const firstKey = statsCache.keys().next().value
    statsCache.delete(firstKey)
  }
  return result
}

const { currencySymbol, formatMonto } = useCurrency()

// Botón atrás del dispositivo cancela la selección en vez de navegar
function onPopState(e) {
  if (seleccionActiva.value) {
    e.preventDefault()
    cancelarSeleccion()
    // Restaurar la entrada de historial que se consumió
    history.pushState(null, '', location.href)
  }
}

watch(seleccionActiva, (activa) => {
  if (activa) {
    history.pushState(null, '', location.href)
    window.addEventListener('popstate', onPopState)
  } else {
    window.removeEventListener('popstate', onPopState)
  }
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
})
</script>

<style scoped>
.expand-enter-active { transition: all 0.25s ease-out; overflow: hidden; }
.expand-leave-active { transition: all 0.2s ease-in; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; transform: translateY(-8px); }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 2000px; transform: translateY(0); }

.gasto-in-enter-active { transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
.gasto-in-leave-active { transition: all 0.18s ease-in; }
.gasto-in-enter-from { opacity: 0; transform: translateY(-8px) scale(0.97); }
.gasto-in-leave-to { opacity: 0; transform: translateX(-12px) scale(0.97); }
.gasto-in-move { transition: transform 0.25s ease; }
</style>
