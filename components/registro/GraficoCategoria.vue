<template>
  <div class="px-4">
    <div v-if="datos.length === 0" class="flex flex-col items-center py-8">
      <div class="w-14 h-14 rounded-full bg-primary-800/60 flex items-center justify-center mb-3">
        <span class="text-xl opacity-50">📊</span>
      </div>
      <p class="text-sm text-gray-500">No hay datos para graficar</p>
    </div>

    <div v-else>
      <!-- Donut chart -->
      <div class="flex justify-center mb-5">
        <div class="relative w-44 h-44">
          <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
            <circle
              v-for="(seg, i) in segmentos"
              :key="i"
              cx="50" cy="50" r="38"
              fill="none"
              :stroke="seg.color"
              :stroke-width="seleccionada && seleccionada === seg.nombre ? 14 : 12"
              :stroke-dasharray="seg.dash"
              :stroke-dashoffset="seg.offset"
              stroke-linecap="round"
              :opacity="seleccionada && seleccionada !== seg.nombre ? 0.2 : 1"
              class="transition-all duration-400 cursor-pointer"
              @click="toggleSeleccion(seg.nombre)"
            />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <template v-if="seleccionada">
              <p class="text-xs text-gray-500">{{ seleccionada }}</p>
              <p class="text-lg font-bold text-white">{{ currencySymbol }} {{ formatMonto(totalSeleccionada) }}</p>
              <p class="text-[10px] text-gray-500">{{ porcentajeSeleccionada.toFixed(1) }}%</p>
            </template>
            <template v-else>
              <p class="text-xs text-gray-500">Gastado</p>
              <p class="text-lg font-bold text-white">{{ currencySymbol }} {{ formatMonto(totalGeneral) }}</p>
              <p v-if="presupuesto > 0" class="text-[10px]" :class="totalGeneral <= presupuesto ? 'text-emerald-400' : 'text-red-400'">
                de {{ currencySymbol }} {{ formatMonto(presupuesto) }}
              </p>
            </template>
          </div>
        </div>
      </div>

      <!-- Hint -->
      <p v-if="seleccionada" class="text-center text-[10px] text-gray-600 -mt-3 mb-4">
        Toca de nuevo para quitar el filtro
      </p>

      <!-- Category breakdown -->
      <div class="space-y-2">
        <div
          v-for="cat in datos"
          :key="cat.nombre"
          class="rounded-xl border overflow-hidden transition-all duration-300"
          :class="[
            seleccionada && seleccionada !== cat.nombre
              ? 'bg-primary-800/30 border-primary-700/15 opacity-40'
              : 'bg-primary-800/60 border-primary-700/30 opacity-100',
          ]"
        >
          <!-- Category header (clickable) -->
          <button
            class="w-full px-3 py-2.5 text-left transition-colors"
            :class="expandida === cat.nombre ? 'bg-primary-700/20' : 'hover:bg-primary-700/10'"
            @click="toggleExpansion(cat.nombre)"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full shrink-0"
                  :style="{ backgroundColor: cat.color }"
                ></div>
                <span class="text-sm text-white font-medium">{{ cat.nombre }}</span>
                <span class="text-xs text-gray-600">{{ cat.cantidad }} {{ cat.cantidad === 1 ? 'gasto' : 'gastos' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-white">{{ currencySymbol }} {{ formatMonto(cat.total) }}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-gray-600 transition-transform duration-200"
                  :class="{ 'rotate-180': expandida === cat.nombre }"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <!-- Progress bar -->
            <div class="w-full h-1.5 bg-primary-700/40 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: cat.porcentaje + '%', backgroundColor: cat.color }"
              ></div>
            </div>
            <p class="text-[10px] text-gray-600 mt-1 text-right">{{ cat.porcentaje.toFixed(1) }}%</p>
          </button>

          <!-- Expanded: expense detail list -->
          <Transition name="expand">
            <div v-if="expandida === cat.nombre" class="border-t border-primary-700/20">
              <div
                v-for="gasto in gastosDeCategoria(cat.nombre)"
                :key="gasto.id"
                class="flex items-center justify-between px-3 py-2 border-b border-primary-700/10 last:border-b-0"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-300 truncate">{{ gasto.concepto }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] text-gray-600">{{ formatFechaCorta(gasto.fecha) }}</span>
                    <span v-if="gasto.hora" class="text-[10px] text-gray-600">{{ formatHora(gasto.hora) }}</span>
                    <span v-if="gasto.metodoRegistro === 'voz'"
                      class="text-[8px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded-full"
                    >VOZ</span>
                  </div>
                </div>
                <span class="text-sm font-medium text-white shrink-0 ml-3">{{ currencySymbol }} {{ formatMonto(gasto.monto) }}</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  datos: { type: Array, default: () => [] },
  gastos: { type: Array, default: () => [] },
  presupuesto: { type: Number, default: 0 },
  categoriaSeleccionadaId: { type: [String, Number, null], default: null },
  categorias: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:categoriaSeleccionada'])

const { currencySymbol, formatMonto } = useCurrency()

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const seleccionada = ref(null)
const expandida = ref(null)

const totalGeneral = computed(() => props.datos.reduce((sum, c) => sum + c.total, 0))

const totalSeleccionada = computed(() => {
  if (!seleccionada.value) return totalGeneral.value
  const cat = props.datos.find(c => c.nombre === seleccionada.value)
  return cat ? cat.total : 0
})

const porcentajeSeleccionada = computed(() => {
  if (!seleccionada.value) return 100
  const cat = props.datos.find(c => c.nombre === seleccionada.value)
  return cat ? cat.porcentaje : 0
})

// Sync from parent: when categoriaSeleccionadaId changes, update local seleccionada
watch(() => props.categoriaSeleccionadaId, (newId) => {
  if (newId === null) {
    seleccionada.value = null
  } else {
    const cat = props.categorias.find(c => c.id === newId)
    if (cat) {
      seleccionada.value = cat.nombre
    }
  }
}, { immediate: true })

function emitCategoriaChange(nombre) {
  if (!nombre) {
    emit('update:categoriaSeleccionada', null)
  } else {
    const cat = props.categorias.find(c => c.nombre === nombre)
    emit('update:categoriaSeleccionada', cat?.id || null)
  }
}

function toggleSeleccion(nombre) {
  seleccionada.value = seleccionada.value === nombre ? null : nombre
  emitCategoriaChange(seleccionada.value)
}

function toggleExpansion(nombre) {
  expandida.value = expandida.value === nombre ? null : nombre
  // Also select in donut when expanding
  if (expandida.value) {
    seleccionada.value = nombre
  }
  emitCategoriaChange(seleccionada.value)
}

function gastosDeCategoria(categoriaNombre) {
  return props.gastos
    .filter(g => (g.categoriaNombre || 'Otros') === categoriaNombre)
    .sort((a, b) => {
      const cmpFecha = b.fecha.localeCompare(a.fecha)
      if (cmpFecha !== 0) return cmpFecha
      return (b.hora || '').localeCompare(a.hora || '')
    })
}

const CIRCUNFERENCIA = 2 * Math.PI * 38

const segmentos = computed(() => {
  const segs = []
  let acumulado = 0
  const gap = props.datos.length > 1 ? 1.5 : 0

  for (const cat of props.datos) {
    const porcion = (cat.porcentaje / 100) * CIRCUNFERENCIA
    const porcionConGap = Math.max(porcion - gap, 0.5)
    segs.push({
      nombre: cat.nombre,
      color: cat.color,
      dash: `${porcionConGap} ${CIRCUNFERENCIA - porcionConGap}`,
      offset: -acumulado,
    })
    acumulado += porcion
  }
  return segs
})

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return ''
  const [anio, mes, dia] = fechaStr.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return `${DIAS_SEMANA_CORTO[fecha.getDay()]} ${dia}/${String(mes).padStart(2, '0')}`
}

function formatHora(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}
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
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
