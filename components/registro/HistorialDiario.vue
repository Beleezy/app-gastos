<template>
  <div class="px-4">
    <!-- View mode toggle: Semana / Día -->
    <div class="flex items-center gap-2 mb-4">
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vistaActiva === 'semana' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
        @click="vistaActiva = 'semana'"
      >
        Por semana
      </button>
      <button
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="vistaActiva === 'dia' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
        @click="vistaActiva = 'dia'"
      >
        Por día
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="bg-primary-800/60 rounded-xl h-14 shimmer"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="sinDatos" class="flex flex-col items-center py-12">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-800/80 to-primary-800/40 flex items-center justify-center mb-4 border border-primary-700/20">
        <span class="text-3xl opacity-40">📝</span>
      </div>
      <p class="text-sm text-gray-400 font-medium">No hay gastos este mes</p>
      <p class="text-xs text-gray-600 mt-1.5">Usa el micrófono o el formulario manual</p>
    </div>

    <!-- Vista por día -->
    <div v-else-if="vistaActiva === 'dia'" class="space-y-2">
      <div v-for="dia in gastosPorDia" :key="dia.fecha">
        <!-- Day header -->
        <button
          class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
          :class="diaExpandido === dia.fecha ? 'bg-blue-500/10 border border-blue-500/20 shadow-sm shadow-blue-500/5' : 'bg-primary-800/50 border border-primary-700/20 hover:bg-primary-800/70'"
          @click="toggleDia(dia.fecha)"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              :class="diaExpandido === dia.fecha ? 'bg-blue-500/15' : 'bg-primary-700/30'"
            >
              <span class="text-xs font-bold" :class="diaExpandido === dia.fecha ? 'text-blue-400' : 'text-gray-400'">{{ extraerDia(dia.fecha) }}</span>
            </div>
            <div class="text-left">
              <p class="text-sm font-medium text-white">{{ formatFechaDia(dia.fecha) }}</p>
              <p class="text-xs text-gray-500">{{ dia.gastos.length }} {{ dia.gastos.length === 1 ? 'gasto' : 'gastos' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-white">{{ currencySymbol }} {{ formatMonto(dia.total) }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-500 transition-transform"
              :class="{ 'rotate-180': diaExpandido === dia.fecha }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <!-- Day detail (expanded) -->
        <Transition name="expand">
          <div v-if="diaExpandido === dia.fecha" class="ml-4 mt-1 space-y-1.5">
            <RegistroGastoItem
              v-for="gasto in dia.gastos"
              :key="gasto.id"
              :gasto="gasto"
              @edit="$emit('edit', gasto)"
              @delete="$emit('delete', gasto)"
            />
          </div>
        </Transition>
      </div>
    </div>

    <!-- Vista por semana -->
    <div v-else class="space-y-3">
      <div v-for="semana in gastosPorSemana" :key="semana.key">
        <!-- Week header -->
        <button
          class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
          :class="semanaExpandida === semana.key ? 'bg-blue-500/10 border border-blue-500/20 shadow-sm shadow-blue-500/5' : 'bg-primary-800/50 border border-primary-700/20 hover:bg-primary-800/70'"
          @click="toggleSemana(semana.key)"
        >
          <div class="text-left">
            <p class="text-sm font-medium text-white">{{ formatRangoSemana(semana.desde, semana.hasta) }}</p>
            <p class="text-xs text-gray-500">{{ semana.dias.length }} {{ semana.dias.length === 1 ? 'día' : 'días' }} con gastos</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-blue-400">{{ currencySymbol }} {{ formatMonto(semana.total) }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-500 transition-transform"
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
                :class="diaExpandido === dia.fecha ? 'bg-primary-700/40 border border-primary-700/30' : 'bg-primary-800/40 hover:bg-primary-800/60'"
                @click.stop="toggleDia(dia.fecha)"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-gray-400 w-6 text-center">{{ extraerDia(dia.fecha) }}</span>
                  <p class="text-sm text-gray-300">{{ formatFechaDia(dia.fecha) }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-white">{{ currencySymbol }} {{ formatMonto(dia.total) }}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-gray-600 transition-transform"
                    :class="{ 'rotate-180': diaExpandido === dia.fecha }"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <!-- Expenses of that day -->
              <Transition name="expand">
                <div v-if="diaExpandido === dia.fecha" class="ml-6 mt-1 space-y-1.5">
                  <RegistroGastoItem
                    v-for="gasto in dia.gastos"
                    :key="gasto.id"
                    :gasto="gasto"
                    @edit="$emit('edit', gasto)"
                    @delete="$emit('delete', gasto)"
                  />
                </div>
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
const diaExpandido = ref(null)
const semanaExpandida = ref(null)

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
</style>
