<template>
  <div class="px-4 lg:px-0 pb-2">
    <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-3">
      Últimos 6 meses
    </h3>
    <div v-if="maxSerie > 0" class="bg-theme-card rounded-2xl border border-theme-border p-4">
      <div class="flex items-end gap-2 h-32">
        <button
          v-for="item in serie6Meses"
          :key="`${item.anio}-${item.mes}`"
          type="button"
          class="flex-1 flex flex-col items-center gap-1 group"
          @click="seleccionar(item)"
        >
          <span
            class="text-[0.6875rem] font-medium transition-colors"
            :class="esSeleccionado(item) ? 'text-emerald-400' : 'text-theme-text-muted'"
          >
            {{ currencySymbol }}&nbsp;{{ formatCorto(item.total) }}
          </span>
          <div class="w-full flex justify-center">
            <div
              class="w-full max-w-[32px] rounded-t-lg transition-all duration-300"
              :class="[
                esSeleccionado(item)
                  ? 'bg-gradient-to-t from-emerald-500 to-teal-400 ring-2 ring-emerald-400/40'
                  : esActual(item)
                    ? 'bg-gradient-to-t from-emerald-500/70 to-teal-400/70'
                    : 'bg-theme-border-md group-hover:bg-theme-text-muted/40',
              ]"
              :style="{
                height: altura(item.total) + 'px',
                minHeight: item.total > 0 ? '4px' : '2px',
              }"
            ></div>
          </div>
          <span
            class="text-[0.6875rem] transition-colors"
            :class="esSeleccionado(item) ? 'text-emerald-400 font-semibold' : 'text-theme-text-sec'"
            >{{ MESES_CORTO[item.mes - 1] }}</span
          >
        </button>
      </div>
    </div>

    <div v-else class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center">
      <p class="text-sm text-theme-text-muted">Sin datos de ahorros aún</p>
    </div>

    <Transition name="slide-up">
      <div
        v-if="mesSeleccionado"
        class="mt-3 bg-theme-card rounded-2xl border border-theme-border overflow-hidden"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-theme-border">
          <div>
            <span class="text-xs font-semibold text-theme-text"
              >{{ MESES_LARGO[mesSeleccionado.mes - 1] }} {{ mesSeleccionado.anio }}</span
            >
            <p class="text-[0.6875rem] text-theme-text-muted mt-0.5">
              {{ registrosMes.length }} registro{{ registrosMes.length !== 1 ? 's' : '' }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-emerald-400">
              +{{ currencySymbol }}&nbsp;{{ formatMonto(mesSeleccionado.total) }}
            </p>
            <button
              class="text-[0.6875rem] text-theme-text-muted hover:text-theme-text mt-0.5"
              @click="cerrar"
            >
              cerrar
            </button>
          </div>
        </div>

        <div v-if="cargando" class="px-4 py-6 text-center">
          <svg
            class="mx-auto h-5 w-5 animate-spin text-theme-accent"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
        </div>

        <div v-else-if="registrosMes.length === 0" class="px-4 py-6 text-center">
          <p class="text-sm text-theme-text-muted">Sin registros este mes</p>
        </div>

        <div v-else class="p-2 space-y-1.5">
          <AhorrosAhorroItemSwipe
            v-for="a in registrosMes"
            :key="a.id"
            :ahorro="a"
            @edit="$emit('editar', $event)"
            @delete="$emit('eliminar', $event)"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const MESES_CORTO = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]
const MESES_LARGO = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

defineEmits(['editar', 'eliminar'])

const {
  serie6Meses,
  mesActual,
  anioActual,
  ahorrosList,
  ahorrosMesSeleccionado,
  mesSeleccionadoGrafico,
  isLoadingMesGrafico,
  fetchAhorrosMes,
  limpiarMesSeleccionado,
} = useAhorros()
const { currencySymbol, formatMonto } = useCurrency()

const mesSeleccionado = ref(null)
const cargando = computed(() => isLoadingMesGrafico.value)

const maxSerie = computed(() => Math.max(...serie6Meses.value.map((s) => s.total), 0))

const registrosMes = computed(() => {
  if (!mesSeleccionado.value) return []
  const { mes, anio } = mesSeleccionado.value
  if (mes === mesActual.value && anio === anioActual.value) {
    return ahorrosList.value
  }
  if (mesSeleccionadoGrafico.value?.mes === mes && mesSeleccionadoGrafico.value?.anio === anio) {
    return ahorrosMesSeleccionado.value
  }
  return []
})

function altura(total) {
  if (maxSerie.value <= 0) return 2
  return Math.max(2, (total / maxSerie.value) * 96)
}
function esActual(item) {
  return item.mes === mesActual.value && item.anio === anioActual.value
}
function esSeleccionado(item) {
  return mesSeleccionado.value?.mes === item.mes && mesSeleccionado.value?.anio === item.anio
}

async function seleccionar(item) {
  if (esSeleccionado(item)) {
    cerrar()
    return
  }
  mesSeleccionado.value = item
  if (item.mes === mesActual.value && item.anio === anioActual.value) {
    limpiarMesSeleccionado()
    return
  }
  try {
    await fetchAhorrosMes(item.mes, item.anio)
  } catch (e) {}
}

function cerrar() {
  mesSeleccionado.value = null
  limpiarMesSeleccionado()
}

function formatCorto(valor) {
  if (valor >= 1000) return (valor / 1000).toFixed(1) + 'k'
  return valor.toFixed(0)
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
