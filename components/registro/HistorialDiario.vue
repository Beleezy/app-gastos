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
          class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
          :class="diaExpandido === dia.fecha ? 'bg-theme-accent-bg border border-theme-accent shadow-sm' : 'bg-theme-card border border-theme-border hover:bg-theme-card'"
          @click="toggleDia(dia.fecha)"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              :class="diaExpandido === dia.fecha ? 'bg-theme-accent-bg' : 'bg-theme-border-md'"
            >
              <span class="text-xs font-bold" :class="diaExpandido === dia.fecha ? 'text-theme-accent' : 'text-theme-text-muted'">{{ extraerDia(dia.fecha) }}</span>
            </div>
            <div class="text-left">
              <p class="text-sm font-medium text-theme-text">{{ formatFechaDia(dia.fecha) }}</p>
              <p class="text-xs text-theme-text-sec">{{ dia.gastos.length }} {{ dia.gastos.length === 1 ? 'gasto' : 'gastos' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(dia.total) }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-sec transition-transform"
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
                class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                :class="diaExpandido === dia.fecha ? 'bg-theme-border-md border border-theme-border' : 'bg-theme-card hover:bg-theme-card'"
                @click.stop="toggleDia(dia.fecha)"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-theme-text-muted w-6 text-center">{{ extraerDia(dia.fecha) }}</span>
                  <p class="text-sm text-theme-text-sec">{{ formatFechaDia(dia.fecha) }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-theme-text">{{ currencySymbol }} {{ formatMonto(dia.total) }}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-theme-text-muted transition-transform"
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
