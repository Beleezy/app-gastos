<template>
  <div class="px-4 lg:px-0 pb-2">
    <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-3">Últimos 6 meses</h3>
    <div v-if="maxSerie > 0" class="bg-theme-card rounded-2xl border border-theme-border p-4">
      <div class="flex items-end gap-2 h-32">
        <div
          v-for="item in serie6Meses"
          :key="`${item.anio}-${item.mes}`"
          class="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
          @click="seleccionar(item)"
        >
          <span class="text-[10px] font-medium transition-colors" :class="esSeleccionado(item) ? 'text-emerald-400' : 'text-theme-text-muted'">
            {{ currencySymbol }} {{ formatCorto(item.total) }}
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
              :style="{ height: altura(item.total) + 'px', minHeight: item.total > 0 ? '4px' : '2px' }"
            ></div>
          </div>
          <span
            class="text-[9px] transition-colors"
            :class="esSeleccionado(item) ? 'text-emerald-400 font-semibold' : 'text-theme-text-sec'"
          >{{ MESES_CORTO[item.mes - 1] }}</span>
        </div>
      </div>
    </div>

    <div v-else class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center">
      <p class="text-sm text-theme-text-muted">Sin datos de ahorros aún</p>
    </div>

    <!-- Detalle del mes seleccionado -->
    <Transition name="slide-up">
      <div v-if="mesSeleccionado && registrosMes.length > 0" class="mt-3 bg-theme-card rounded-2xl border border-theme-border overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-theme-border">
          <div>
            <span class="text-xs font-semibold text-theme-text">{{ MESES_LARGO[mesSeleccionado.mes - 1] }} {{ mesSeleccionado.anio }}</span>
            <p class="text-[10px] text-theme-text-muted mt-0.5">{{ registrosMes.length }} registro{{ registrosMes.length !== 1 ? 's' : '' }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-emerald-400">+{{ currencySymbol }} {{ formatMonto(mesSeleccionado.total) }}</p>
            <button
              class="text-[10px] text-theme-text-muted hover:text-theme-text mt-0.5"
              @click="mesSeleccionado = null"
            >cerrar</button>
          </div>
        </div>
        <div>
          <div
            v-for="ahorro in registrosMes"
            :key="ahorro.id"
            class="flex items-center gap-3 px-4 py-2.5 border-b border-theme-border/40 last:border-b-0"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :style="{ backgroundColor: (ahorro.medioColor || '#6b7280') + '26' }"
            >
              <span class="text-xs">{{ ahorro.medioIcono || '💰' }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-theme-text truncate">{{ ahorro.concepto || ahorro.medioNombre || 'Ahorro' }}</p>
              <p class="text-[10px] text-theme-text-muted">{{ ahorro.medioNombre }} · {{ formatFecha(ahorro.fecha) }}</p>
            </div>
            <span class="text-sm font-semibold text-emerald-400 whitespace-nowrap">+{{ currencySymbol }} {{ formatMonto(ahorro.monto) }}</span>
          </div>
        </div>
      </div>

      <!-- Mes sin registros -->
      <div v-else-if="mesSeleccionado && registrosMes.length === 0" class="mt-3 bg-theme-card rounded-2xl border border-theme-border p-4 text-center">
        <p class="text-sm text-theme-text-muted">Sin registros en {{ MESES_LARGO[mesSeleccionado.mes - 1] }} {{ mesSeleccionado.anio }}</p>
        <button class="text-[10px] text-theme-text-muted hover:text-theme-text mt-1" @click="mesSeleccionado = null">cerrar</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const { serie6Meses, mesActual, anioActual, ahorrosList } = useAhorros()
const { currencySymbol, formatMonto } = useCurrency()

const mesSeleccionado = ref(null)

const maxSerie = computed(() => Math.max(...serie6Meses.value.map(s => s.total), 0))

// Registros del mes seleccionado — filtra del historial local cuando es el mes actual,
// para meses pasados usa los datos de serie (solo tenemos totales, no registros individuales)
const registrosMes = computed(() => {
  if (!mesSeleccionado.value) return []
  const { mes, anio } = mesSeleccionado.value
  // Si es el mes actualmente cargado en ahorrosList, usamos esos registros
  if (mes === mesActual.value && anio === anioActual.value) {
    return ahorrosList.value
  }
  // Para otros meses del gráfico no tenemos registros individuales cargados
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

function seleccionar(item) {
  if (esSeleccionado(item)) {
    mesSeleccionado.value = null
  } else {
    mesSeleccionado.value = item
  }
}

function formatCorto(valor) {
  if (valor >= 1000) return (valor / 1000).toFixed(1) + 'k'
  return valor.toFixed(0)
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(`${fecha}T00:00:00`)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
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
