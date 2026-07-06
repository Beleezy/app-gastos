<template>
  <div class="px-4 lg:px-0 pt-4 lg:pt-6 pb-2">
    <div class="relative bg-gradient-to-br from-theme-card to-theme-card/90 rounded-2xl p-4 border border-theme-border overflow-hidden">
      <!-- Decorative accent -->
      <div
        class="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl transition-colors duration-500"
        :class="tabActual === 'me_deben' ? 'bg-emerald-500/8' : 'bg-red-500/8'"
      ></div>

      <div class="relative">
        <!-- 1. Tab toggle como switch principal (full width) -->
        <div class="flex bg-theme-input rounded-xl p-1 border border-theme-border mb-4">
          <button
            class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
            :class="tabActual === 'me_deben'
              ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
              : 'text-theme-text-sec hover:text-theme-text-muted'"
            data-testid="tab-me-deben"
            @click="cambiarTab('me_deben')"
          >
            Me deben
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
            :class="tabActual === 'yo_debo'
              ? 'bg-red-500/20 text-red-400 shadow-sm'
              : 'text-theme-text-sec hover:text-theme-text-muted'"
            data-testid="tab-yo-debo"
            @click="cambiarTab('yo_debo')"
          >
            Yo debo
          </button>
        </div>

        <!-- 2. Monto principal + contraparte pequeña -->
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <div class="min-w-0">
            <p
              class="text-3xl font-bold leading-none transition-colors duration-300"
              :class="tabActual === 'me_deben' ? 'text-gradient-emerald' : 'text-red-400'"
            >
              {{ currencySymbol }}&nbsp;{{ formatMonto(montoActual) }}
            </p>
            <p class="text-[0.6875rem] text-theme-text-sec mt-1.5">
              {{ countActual }} deuda{{ countActual !== 1 ? 's' : '' }} pendiente{{ countActual !== 1 ? 's' : '' }}
            </p>
          </div>
          <button
            class="text-right shrink-0 group"
            @click="toggleTab"
            :title="`Cambiar a ${tabActual === 'me_deben' ? 'Yo debo' : 'Me deben'}`"
          >
            <p class="text-[0.6875rem] text-theme-text-sec leading-tight group-hover:text-theme-text-muted transition-colors">
              {{ tabActual === 'me_deben' ? 'Yo debo' : 'Me deben' }}
            </p>
            <p
              class="text-base font-semibold leading-tight"
              :class="tabActual === 'me_deben' ? 'text-red-400' : 'text-emerald-400'"
            >
              {{ currencySymbol }}&nbsp;{{ formatMonto(montoOpuesto) }}
            </p>
          </button>
        </div>

        <!-- 3. Tendencia compacta -->
        <div v-if="tendencia !== null" class="flex items-center gap-1 mt-2">
          <svg
            v-if="tendencia > 0"
            xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-400 shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          <svg
            v-else-if="tendencia < 0"
            xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-red-400 shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          <span
            class="text-[0.6875rem]"
            :class="tendencia > 0 ? 'text-emerald-400' : tendencia < 0 ? 'text-red-400' : 'text-theme-text-sec'"
          >
            <template v-if="tendencia !== 0">
              {{ tendencia > 0 ? '+' : '-' }}{{ currencySymbol }}&nbsp;{{ formatMonto(Math.abs(tendencia)) }}
            </template>
            <template v-else>Sin cambios</template>
            vs mes pasado
          </span>
        </div>

        <!-- 4. Barra de balance + "% a favor / S/ X neto" -->
        <div v-if="totalGeneral > 0" class="mt-3">
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
          <div class="flex items-center justify-between mt-1.5 gap-2">
            <span class="text-[0.6875rem] text-emerald-400/80 font-medium">
              {{ porcentajeMeDeben.toFixed(0) }}% a favor
            </span>
            <span
              class="text-[0.6875rem] font-semibold"
              :class="resumen.balanceNeto >= 0 ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ currencySymbol }}&nbsp;{{ formatMonto(Math.abs(resumen.balanceNeto)) }}
              {{ resumen.balanceNeto >= 0 ? 'neto' : 'en contra' }}
            </span>
          </div>
        </div>

        <!-- 5. Alerta de vencidas compacta (inline, una sola línea) -->
        <button
          v-if="countVencidas > 0"
          class="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 transition-colors text-left min-w-0"
          @click="toggleFiltroVencidas"
        >
          <span class="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0"></span>
          <span class="text-[0.6875rem] font-semibold text-red-400 shrink-0">
            {{ countVencidas }} deuda{{ countVencidas !== 1 ? 's' : '' }} vencida{{ countVencidas !== 1 ? 's' : '' }}
          </span>
          <span v-if="primeraVencida" class="text-[0.6875rem] text-red-400/80 truncate flex-1 min-w-0">
            <span class="opacity-60">·</span>
            {{ primeraVencida.nombre }}
            <span class="opacity-60">·</span>
            {{ currencySymbol }}&nbsp;{{ formatMonto(primeraVencida.totalPendiente) }}
          </span>
          <span class="ml-auto shrink-0 text-[0.6875rem] font-semibold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
            {{ filtroEstado === 'vencidas' ? 'Quitar' : 'Ver' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { resumen, tabActual, cambiarTab, filtroEstado, personas } = useDeudas()

const totalGeneral = computed(() => resumen.value.totalMeDeben + resumen.value.totalYoDebo)
const porcentajeMeDeben = computed(() => {
  if (totalGeneral.value === 0) return 50
  return (resumen.value.totalMeDeben / totalGeneral.value) * 100
})

const montoActual = computed(() =>
  tabActual.value === 'me_deben' ? resumen.value.totalMeDeben : resumen.value.totalYoDebo
)
const montoOpuesto = computed(() =>
  tabActual.value === 'me_deben' ? resumen.value.totalYoDebo : resumen.value.totalMeDeben
)
const countActual = computed(() =>
  tabActual.value === 'me_deben' ? resumen.value.countMeDeben : resumen.value.countYoDebo
)

const countVencidas = computed(() =>
  tabActual.value === 'me_deben' ? resumen.value.countVencidasMeDeben : resumen.value.countVencidasYoDebo
)

// Persona vencida más urgente (mayor monto entre las que tienen vencidas)
const primeraVencida = computed(() => {
  const conVencidas = (personas.value || []).filter(p => p.tieneVencidas)
  if (conVencidas.length === 0) return null
  return [...conVencidas].sort((a, b) => (b.totalPendiente || 0) - (a.totalPendiente || 0))[0]
})

function toggleFiltroVencidas() {
  filtroEstado.value = filtroEstado.value === 'vencidas' ? 'todos' : 'vencidas'
}

function toggleTab() {
  cambiarTab(tabActual.value === 'me_deben' ? 'yo_debo' : 'me_deben')
}

const { currencySymbol, formatMonto } = useCurrency()

// Tendencia: compara balanceNeto actual vs snapshot del mes anterior
const SNAPSHOT_KEY = 'deudas-balance-snapshot'
const tendencia = ref(null)

function actualizarTendencia() {
  if (!process.client) return
  const balance = resumen.value.balanceNeto
  const hoyStr = useFechaPeru().fechaHoy()
  const [a, m] = hoyStr.split('-')
  const mesActual = `${a}-${parseInt(m, 10)}`

  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    const snapshot = raw ? JSON.parse(raw) : null

    if (snapshot && snapshot.mes !== mesActual) {
      tendencia.value = balance - snapshot.balance
    }

    if (!snapshot || snapshot.mes !== mesActual) {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ mes: mesActual, balance }))
    }
  } catch { /* sin soporte localStorage */ }
}

watch(() => resumen.value.balanceNeto, actualizarTendencia)
onMounted(actualizarTendencia)
</script>
