<template>
  <div class="px-4 lg:px-0 pt-4 lg:pt-6 pb-2">
    <!-- Header principal: Me deben (protagonista) -->
    <div class="relative bg-gradient-to-br from-theme-card to-theme-card/90 rounded-2xl p-4 mb-3 border border-theme-border overflow-hidden">
      <!-- Decorative accent -->
      <div class="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl transition-colors duration-500"
        :class="tabActual === 'me_deben' ? 'bg-emerald-500/8' : 'bg-red-500/8'"
      ></div>

      <div class="relative">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full transition-colors duration-300"
              :class="tabActual === 'me_deben' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400 shadow-sm shadow-red-400/50'"
            ></div>
            <h3 class="text-sm font-semibold text-theme-text">{{ tabActual === 'me_deben' ? 'Me deben' : 'Yo debo' }}</h3>
          </div>
          <span class="text-[10px] text-theme-text-sec bg-theme-input px-2 py-0.5 rounded-full">
            {{ tabActual === 'me_deben' ? resumen.countMeDeben : resumen.countYoDebo }}
            deuda{{ (tabActual === 'me_deben' ? resumen.countMeDeben : resumen.countYoDebo) !== 1 ? 's' : '' }}
          </span>
        </div>
        <p class="text-2xl font-bold transition-colors duration-300" :class="tabActual === 'me_deben' ? 'text-gradient-emerald' : 'text-red-400'">
          {{ currencySymbol }} {{ formatMonto(tabActual === 'me_deben' ? resumen.totalMeDeben : resumen.totalYoDebo) }}
        </p>

        <!-- Indicador de tendencia -->
        <div v-if="tendencia !== null" class="flex items-center gap-1.5 mt-2 mb-1">
          <svg v-if="tendencia > 0" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          <svg v-else-if="tendencia < 0" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          <span v-else class="w-3.5 h-3.5 flex items-center justify-center text-theme-text-sec text-xs">—</span>
          <span class="text-[10px]" :class="tendencia > 0 ? 'text-emerald-400' : tendencia < 0 ? 'text-red-400' : 'text-theme-text-sec'">
            {{ tendencia > 0 ? 'Mejorando' : tendencia < 0 ? 'Empeorando' : 'Sin cambios' }} vs mes pasado
            <span v-if="tendencia !== 0">({{ tendencia > 0 ? '+' : '' }}{{ currencySymbol }} {{ formatMonto(Math.abs(tendencia)) }})</span>
          </span>
        </div>

        <!-- Alerta de vencidas -->
        <button
          v-if="countVencidas > 0"
          class="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 transition-colors text-left"
          @click="toggleFiltroVencidas"
        >
          <span class="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0"></span>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-semibold text-red-400 leading-tight">
              {{ countVencidas }} deuda{{ countVencidas !== 1 ? 's' : '' }} vencida{{ countVencidas !== 1 ? 's' : '' }}
            </p>
            <p class="text-[10px] text-red-400/80 leading-tight">
              {{ currencySymbol }} {{ formatMonto(montoVencido) }} · toca para filtrar
            </p>
          </div>
          <svg v-if="filtroEstado === 'vencidas'" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-red-400/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>

        <!-- Balance visual bar -->
        <div v-if="totalGeneral > 0" class="mt-4 mb-1">
          <div class="flex h-1.5 rounded-full overflow-hidden bg-theme-input gap-0.5">
            <div
              class="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
              :style="{ width: porcentajeMeDeben + '%' }"
            ></div>
            <div
              class="bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700 ease-out"
              :style="{ width: (100 - porcentajeMeDeben) + '%' }"
            ></div>
          </div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-[10px] text-emerald-400/80 font-medium">{{ porcentajeMeDeben.toFixed(0) }}% a favor</span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :class="resumen.balanceNeto >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'"
            >
              {{ currencySymbol }} {{ formatMonto(Math.abs(resumen.balanceNeto)) }} {{ resumen.balanceNeto >= 0 ? 'a favor' : 'en contra' }}
            </span>
          </div>
        </div>

        <!-- Botón pequeño para "Yo debo" -->
        <div class="border-t border-theme-border mt-3 pt-3 flex items-center justify-between">
          <button
            class="flex items-center gap-2 text-xs transition-all duration-300"
            :class="tabActual === 'yo_debo' ? 'text-red-400' : 'text-theme-text-sec hover:text-theme-text-muted'"
            @click="toggleYoDebo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>Yo debo: <span class="font-semibold text-red-400">{{ currencySymbol }} {{ formatMonto(resumen.totalYoDebo) }}</span></span>
            <span v-if="resumen.countYoDebo > 0" class="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[9px] font-semibold">
              {{ resumen.countYoDebo }}
            </span>
          </button>
          <!-- Tab indicator -->
          <div class="flex bg-theme-input rounded-xl p-0.5 border border-theme-border">
            <button
              class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-300"
              :class="tabActual === 'me_deben' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-theme-text-sec hover:text-theme-text-muted'"
              @click="cambiarTab('me_deben')"
            >
              Me deben
            </button>
            <button
              class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-300"
              :class="tabActual === 'yo_debo' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-theme-text-sec hover:text-theme-text-muted'"
              @click="cambiarTab('yo_debo')"
            >
              Yo debo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { resumen, tabActual, cambiarTab, filtroEstado } = useDeudas()

const totalGeneral = computed(() => resumen.value.totalMeDeben + resumen.value.totalYoDebo)
const porcentajeMeDeben = computed(() => {
  if (totalGeneral.value === 0) return 50
  return (resumen.value.totalMeDeben / totalGeneral.value) * 100
})

const countVencidas = computed(() =>
  tabActual.value === 'me_deben' ? resumen.value.countVencidasMeDeben : resumen.value.countVencidasYoDebo
)
const montoVencido = computed(() =>
  tabActual.value === 'me_deben' ? resumen.value.montoVencidoMeDeben : resumen.value.montoVencidoYoDebo
)

function toggleFiltroVencidas() {
  filtroEstado.value = filtroEstado.value === 'vencidas' ? 'todos' : 'vencidas'
}

function toggleYoDebo() {
  cambiarTab(tabActual.value === 'yo_debo' ? 'me_deben' : 'yo_debo')
}

const { currencySymbol, formatMonto } = useCurrency()

// Tendencia: compara balanceNeto actual vs snapshot del mes anterior
const SNAPSHOT_KEY = 'deudas-balance-snapshot'
const tendencia = ref(null)

function actualizarTendencia() {
  if (!process.client) return
  const balance = resumen.value.balanceNeto
  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${hoy.getMonth() + 1}`

  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    const snapshot = raw ? JSON.parse(raw) : null

    if (snapshot && snapshot.mes !== mesActual) {
      // Tenemos snapshot de un mes anterior — comparar
      tendencia.value = balance - snapshot.balance
    }

    // Guardar snapshot del mes actual (sobreescribir o crear)
    if (!snapshot || snapshot.mes !== mesActual) {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ mes: mesActual, balance }))
    }
  } catch { /* sin soporte localStorage */ }
}

watch(() => resumen.value.balanceNeto, actualizarTendencia)
onMounted(actualizarTendencia)
</script>
