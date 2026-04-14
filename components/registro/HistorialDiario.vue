<template>
  <div class="px-4">
    <!-- View mode toggle: Semana / Día -->
    <div class="flex items-center gap-2 mb-4">
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vistaActiva === 'semana' ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
        @click="vistaActiva = 'semana'"
      >
        Por semana
      </button>
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vistaActiva === 'dia' ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent' : 'bg-theme-card text-theme-text-sec border border-theme-border'"
        @click="vistaActiva = 'dia'"
      >
        Por día
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="bg-theme-card rounded-xl h-14 shimmer"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="sinDatos" class="flex flex-col items-center py-12">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-theme-card/80 to-theme-card/40 flex items-center justify-center mb-4 border border-theme-border">
        <span class="text-3xl opacity-40">📝</span>
      </div>
      <p class="text-sm text-theme-text-muted font-medium">No hay gastos este mes</p>
      <p class="text-xs text-theme-text-muted mt-1.5">Usa el micrófono o el formulario manual</p>
    </div>

    <!-- Vista por día -->
    <div v-else-if="vistaActiva === 'dia'" class="space-y-2">
      <div v-for="dia in gastosPorDia" :key="dia.fecha">
        <!-- Day header -->
        <button
          class="w-full px-3.5 py-2.5 rounded-xl transition-all duration-200"
          :class="diaExpandido === dia.fecha ? 'bg-theme-accent-bg border border-theme-accent shadow-sm' : 'bg-theme-card border border-theme-border hover:bg-theme-card'"
          @click="toggleDia(dia.fecha)"
        >
          <div class="flex items-center gap-3">
            <!-- Day number block -->
            <div class="w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-colors shrink-0"
              :class="diaExpandido === dia.fecha ? 'bg-theme-accent-bg border border-theme-accent/30' : 'bg-theme-border-md'"
            >
              <span class="text-[9px] uppercase leading-none font-semibold" :class="diaExpandido === dia.fecha ? 'text-theme-accent' : 'text-theme-text-muted'">{{ nombreDiaSemana(dia.fecha) }}</span>
              <span class="text-base font-bold leading-tight" :class="diaExpandido === dia.fecha ? 'text-theme-accent' : 'text-theme-text'">{{ extraerDia(dia.fecha) }}</span>
            </div>

            <!-- Main info -->
            <div class="flex-1 min-w-0 text-left">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-theme-text truncate">{{ formatFechaDia(dia.fecha) }}</p>
                <span class="text-sm font-bold text-theme-text shrink-0">{{ currencySymbol }} {{ formatMonto(dia.total) }}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-theme-border-md text-theme-text-sec leading-none font-medium">
                  {{ dia.gastos.length }} {{ dia.gastos.length === 1 ? 'gasto' : 'gastos' }}
                </span>
                <span v-if="statsDia(dia).topCat" class="text-[10px] px-1.5 py-0.5 rounded-md leading-none font-medium"
                  :style="{ backgroundColor: statsDia(dia).topCat.color + '20', color: statsDia(dia).topCat.color }"
                >
                  {{ statsDia(dia).topCat.icono }} {{ statsDia(dia).topCat.nombre }}
                </span>
                <span class="text-[10px] text-theme-text-muted leading-none">
                  Prom. {{ currencySymbol }} {{ formatMonto(statsDia(dia).promedio) }}
                </span>
                <span v-if="statsDia(dia).rangoHoras" class="text-[10px] text-theme-text-muted leading-none">
                  · {{ statsDia(dia).rangoHoras }}
                </span>
              </div>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-sec transition-transform shrink-0"
              :class="{ 'rotate-180': diaExpandido === dia.fecha }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <!-- Day detail (expanded) -->
        <Transition name="expand">
          <TransitionGroup v-if="diaExpandido === dia.fecha" name="gasto-in" tag="div" class="ml-4 mt-1 space-y-1.5">
            <RegistroGastoItem
              v-for="gasto in dia.gastos"
              :key="gasto.id"
              :gasto="gasto"
              @edit="$emit('edit', gasto)"
              @delete="$emit('delete', gasto)"
            />
          </TransitionGroup>
        </Transition>
      </div>
    </div>

    <!-- Vista por semana -->
    <div v-else class="space-y-3">
      <div v-for="semana in gastosPorSemana" :key="semana.key">
        <!-- Week header -->
        <button
          class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
          :class="semanaExpandida === semana.key ? 'bg-theme-accent-bg border border-theme-accent shadow-sm' : 'bg-theme-card border border-theme-border hover:bg-theme-card'"
          @click="toggleSemana(semana.key)"
        >
          <div class="text-left">
            <p class="text-sm font-medium text-theme-text">{{ formatRangoSemana(semana.desde, semana.hasta) }}</p>
            <p class="text-xs text-theme-text-sec">{{ semana.dias.length }} {{ semana.dias.length === 1 ? 'día' : 'días' }} con gastos</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-theme-accent">{{ currencySymbol }} {{ formatMonto(semana.total) }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-sec transition-transform"
              :class="{ 'rotate-180': semanaExpandida === semana.key }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <!-- Week detail (expanded) - shows days -->
        <Transition name="expand">
          <div v-if="semanaExpandida === semana.key" class="ml-2 mt-1 space-y-1.5">
            <div v-for="dia in semana.dias" :key="dia.fecha">
              <!-- Day within week -->
              <button
                class="w-full px-3 py-2 rounded-lg transition-colors"
                :class="diaExpandido === dia.fecha ? 'bg-theme-border-md border border-theme-border' : 'bg-theme-card hover:bg-theme-card'"
                @click.stop="toggleDia(dia.fecha)"
              >
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-lg flex flex-col items-center justify-center bg-theme-card border border-theme-border shrink-0">
                    <span class="text-[8px] uppercase leading-none font-semibold text-theme-text-muted">{{ nombreDiaSemana(dia.fecha) }}</span>
                    <span class="text-xs font-bold text-theme-text leading-tight">{{ extraerDia(dia.fecha) }}</span>
                  </div>
                  <div class="flex-1 min-w-0 text-left">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs font-medium text-theme-text-sec truncate">{{ formatFechaDia(dia.fecha) }}</p>
                      <span class="text-sm font-semibold text-theme-text shrink-0">{{ currencySymbol }} {{ formatMonto(dia.total) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="text-[10px] text-theme-text-muted leading-none">{{ dia.gastos.length }} {{ dia.gastos.length === 1 ? 'gasto' : 'gastos' }}</span>
                      <span v-if="statsDia(dia).topCat" class="text-[10px] px-1 py-0.5 rounded leading-none font-medium"
                        :style="{ backgroundColor: statsDia(dia).topCat.color + '20', color: statsDia(dia).topCat.color }"
                      >
                        {{ statsDia(dia).topCat.icono }} {{ statsDia(dia).topCat.nombre }}
                      </span>
                      <span v-if="statsDia(dia).rangoHoras" class="text-[10px] text-theme-text-muted leading-none">· {{ statsDia(dia).rangoHoras }}</span>
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-theme-text-muted transition-transform shrink-0"
                    :class="{ 'rotate-180': diaExpandido === dia.fecha }"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Expenses of that day -->
              <Transition name="expand">
                <TransitionGroup v-if="diaExpandido === dia.fecha" name="gasto-in" tag="div" class="ml-6 mt-1 space-y-1.5">
                  <RegistroGastoItem
                    v-for="gasto in dia.gastos"
                    :key="gasto.id"
                    :gasto="gasto"
                    @edit="$emit('edit', gasto)"
                    @delete="$emit('delete', gasto)"
                  />
                </TransitionGroup>
              </Transition>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  gastosPorDia: { type: Array, default: () => [] },
  gastosPorSemana: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  formatFechaDia: { type: Function, required: true },
  formatRangoSemana: { type: Function, required: true },
})

defineEmits(['edit', 'delete'])

const vistaActiva = ref('semana')

// Fecha de hoy como string YYYY-MM-DD
const hoy = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})()

const diaExpandido = ref(hoy) // hoy abierto por defecto
const semanaExpandida = ref(null)

// Auto-expandir la semana actual al cargar datos (solo la primera vez)
const semanaInicializada = ref(false)
watch(() => props.gastosPorSemana, (semanas) => {
  if (semanaInicializada.value || !semanas.length) return
  const semanaHoy = semanas.find(s => s.desde <= hoy && hoy <= s.hasta)
  if (semanaHoy) semanaExpandida.value = semanaHoy.key
  semanaInicializada.value = true
}, { immediate: true })

const sinDatos = computed(() => props.gastosPorDia.length === 0 && props.gastosPorSemana.length === 0)

function toggleDia(fecha) {
  diaExpandido.value = diaExpandido.value === fecha ? null : fecha
}

function toggleSemana(key) {
  semanaExpandida.value = semanaExpandida.value === key ? null : key
  if (semanaExpandida.value !== key) {
    diaExpandido.value = null
  }
}

function extraerDia(fechaStr) {
  return parseInt(fechaStr.split('-')[2])
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
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

function statsDia(dia) {
  const gastos = dia.gastos || []
  if (!gastos.length) return { topCat: null, promedio: 0, rangoHoras: '' }

  const porCat = new Map()
  for (const g of gastos) {
    const key = g.categoriaId || g.categoriaNombre || 'otros'
    const acc = porCat.get(key) || { total: 0, nombre: g.categoriaNombre || 'Otros', color: g.categoriaColor || '#6b7280', icono: resolveIcono(g.categoriaIcono) }
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
  if (horas.length >= 2) {
    rangoHoras = `${formatHoraCorta(horas[0])}–${formatHoraCorta(horas[horas.length - 1])}`
  } else if (horas.length === 1) {
    rangoHoras = formatHoraCorta(horas[0])
  }

  return { topCat, promedio, rangoHoras }
}

const { currencySymbol, formatMonto } = useCurrency()
</script>

<style scoped>
.expand-enter-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}
.expand-leave-active {
  transition: all 0.2s ease-in;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
  transform: translateY(0);
}

/* Animación de entrada para nuevos gastos */
.gasto-in-enter-active {
  transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.gasto-in-leave-active {
  transition: all 0.18s ease-in;
}
.gasto-in-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
.gasto-in-leave-to {
  opacity: 0;
  transform: translateX(-12px) scale(0.97);
}
.gasto-in-move {
  transition: transform 0.25s ease;
}
</style>
