<template>
  <div class="px-4 lg:px-0 pb-2">
    <!-- Toggle de vista -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Por medio</h3>
      <div class="flex items-center gap-1 bg-theme-input rounded-lg p-0.5">
        <button
          class="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
          :class="vista === 'resumen' ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-text-muted'"
          @click="vista = 'resumen'"
        >
          Resumen
        </button>
        <button
          class="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
          :class="vista === 'detalle' ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-text-muted'"
          @click="vista = 'detalle'"
        >
          Detalle
        </button>
      </div>
    </div>

    <template v-if="porMedio.length > 0">
      <!-- Vista resumen: barra de progreso por medio -->
      <div v-if="vista === 'resumen'" class="space-y-1.5">
        <div
          v-for="item in porMedio"
          :key="item.medioAhorroId"
          class="flex items-center gap-3 rounded-xl bg-theme-card border border-theme-border p-3"
        >
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            :style="{ backgroundColor: (item.medioColor || '#6b7280') + '26' }"
          >
            <span class="text-sm">{{ item.medioIcono || '💰' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-theme-text truncate">{{ item.medioNombre || 'Sin medio' }}</span>
              <span class="text-sm font-bold text-theme-text whitespace-nowrap ml-2">{{ currencySymbol }} {{ formatMonto(item.total) }}</span>
            </div>
            <div class="mt-1.5 relative w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                :style="{ width: porcentaje(item.total) + '%', backgroundColor: item.medioColor || '#6b7280' }"
              ></div>
            </div>
          </div>
          <span class="text-[10px] text-theme-text-muted font-medium w-10 text-right shrink-0">{{ porcentaje(item.total).toFixed(0) }}%</span>
        </div>
      </div>

      <!-- Vista detalle: cada medio expandido con sus registros -->
      <div v-else class="space-y-2">
        <div
          v-for="item in porMedioConRegistros"
          :key="item.medioAhorroId"
          class="rounded-xl bg-theme-card border border-theme-border overflow-hidden"
        >
          <!-- Cabecera del medio -->
          <button
            class="w-full flex items-center gap-3 p-3 hover:bg-theme-input/50 transition-colors"
            @click="toggleMedio(item.medioAhorroId)"
          >
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              :style="{ backgroundColor: (item.medioColor || '#6b7280') + '26' }"
            >
              <span class="text-sm">{{ item.medioIcono || '💰' }}</span>
            </div>
            <div class="flex-1 min-w-0 text-left">
              <span class="text-sm font-medium text-theme-text">{{ item.medioNombre || 'Sin medio' }}</span>
              <p class="text-[10px] text-theme-text-muted">{{ item.registros.length }} registro{{ item.registros.length !== 1 ? 's' : '' }}</p>
            </div>
            <span class="text-sm font-bold text-emerald-400 whitespace-nowrap mr-1">+{{ currencySymbol }} {{ formatMonto(item.total) }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-theme-text-muted transition-transform duration-200 shrink-0"
              :class="expandidos.has(item.medioAhorroId) ? 'rotate-180' : ''"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Registros del medio -->
          <Transition name="expand">
            <div v-if="expandidos.has(item.medioAhorroId)" class="border-t border-theme-border">
              <div
                v-for="ahorro in item.registros"
                :key="ahorro.id"
                class="flex items-center gap-3 px-3 py-2.5 border-b border-theme-border/40 last:border-b-0"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-theme-text truncate">{{ ahorro.concepto || ahorro.medioNombre || 'Ahorro' }}</p>
                  <p class="text-[10px] text-theme-text-muted">{{ formatFecha(ahorro.fecha) }}</p>
                </div>
                <span class="text-sm font-semibold text-emerald-400 whitespace-nowrap">+{{ currencySymbol }} {{ formatMonto(ahorro.monto) }}</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-6">
      <p class="text-sm text-theme-text-muted">No hay ahorros este mes</p>
    </div>
  </div>
</template>

<script setup>
const { porMedio, totalMes, ahorrosList } = useAhorros()
const { currencySymbol, formatMonto } = useCurrency()

const vista = ref('resumen')
const expandidos = ref(new Set())

const porMedioConRegistros = computed(() =>
  porMedio.value.map(item => ({
    ...item,
    registros: ahorrosList.value.filter(a => a.medioAhorroId === item.medioAhorroId),
  }))
)

function porcentaje(monto) {
  return totalMes.value > 0 ? (monto / totalMes.value) * 100 : 0
}

function toggleMedio(id) {
  if (expandidos.value.has(id)) {
    expandidos.value.delete(id)
  } else {
    expandidos.value.add(id)
  }
  // trigger reactivity
  expandidos.value = new Set(expandidos.value)
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(`${fecha}T00:00:00`)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
