<!--
  ResumenDeudasV2 — rediseño del resumen general de /deudas.

  Cambios respecto a V1 (ResumenDeudas.vue):
    • Toggle segmentado más grande (44px tap) arriba.
    • UN solo monto hero según pestaña activa (V1 mostraba 2 grandes
      compitiendo). El monto opuesto pasa a chip secundario.
    • Tendencia con icono direccional limpio.
    • Banner de vencidas con jerarquía clara (no oculto en línea).

  Mismos composables/emits que V1.
-->
<template>
  <div class="px-4 lg:px-0 pt-4 lg:pt-6 pb-2">
    <!-- Toggle segmentado -->
    <div class="grid grid-cols-2 bg-theme-card rounded-2xl p-1.5 border border-theme-border mb-4">
      <button
        class="py-3 rounded-xl text-sm font-semibold transition-all duration-300 tap-44"
        :class="tabActual === 'me_deben'
          ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
          : 'text-theme-text-muted hover:text-theme-text-sec'"
        data-testid="tab-me-deben"
        @click="cambiarTab('me_deben')"
      >
        💚 Me deben
      </button>
      <button
        class="py-3 rounded-xl text-sm font-semibold transition-all duration-300 tap-44"
        :class="tabActual === 'yo_debo'
          ? 'bg-red-500/15 text-red-400 shadow-sm'
          : 'text-theme-text-muted hover:text-theme-text-sec'"
        data-testid="tab-yo-debo"
        @click="cambiarTab('yo_debo')"
      >
        💸 Yo debo
      </button>
    </div>

    <!-- Hero único -->
    <div
      class="relative rounded-3xl p-5 border overflow-hidden"
      :class="tabActual === 'me_deben'
        ? 'bg-gradient-to-br from-theme-card to-emerald-500/[0.04] border-emerald-500/15'
        : 'bg-gradient-to-br from-theme-card to-red-500/[0.04] border-red-500/15'"
    >
      <div
        class="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none"
        :class="tabActual === 'me_deben' ? 'bg-emerald-500/10' : 'bg-red-500/10'"
      ></div>

      <div class="relative">
        <p class="text-hero-label">{{ tabActual === 'me_deben' ? 'Total por cobrar' : 'Total a pagar' }}</p>
        <div class="flex items-baseline gap-1 mt-1.5">
          <span class="text-xl font-medium text-theme-text-muted">{{ currencySymbol }}</span>
          <span
            class="text-hero tabular-nums"
            :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
          >{{ formatMonto(montoActual) }}</span>
        </div>
        <p class="text-sm text-theme-text-sec mt-1">
          {{ countActual }} deuda{{ countActual !== 1 ? 's' : '' }} pendiente{{ countActual !== 1 ? 's' : '' }}
        </p>
      </div>

      <!-- Balance bar -->
      <div v-if="totalGeneral > 0" class="relative mt-4">
        <div class="flex h-2 rounded-full overflow-hidden bg-theme-input gap-0.5">
          <div
            class="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
            :style="{ width: porcentajeMeDeben + '%' }"
          ></div>
          <div
            class="bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700 ease-out"
            :style="{ width: (100 - porcentajeMeDeben) + '%' }"
          ></div>
        </div>
      </div>

      <!-- Insights row -->
      <div class="relative mt-4 pt-3 border-t border-theme-border flex flex-wrap items-center gap-x-3 gap-y-2">
        <!-- Monto opuesto chip -->
        <button
          class="inline-flex items-center gap-2 text-xs tap-44"
          @click="toggleTab"
          :title="`Cambiar a ${tabActual === 'me_deben' ? 'Yo debo' : 'Me deben'}`"
        >
          <span class="text-theme-text-muted">{{ tabActual === 'me_deben' ? 'Yo debo:' : 'Me deben:' }}</span>
          <strong
            class="font-semibold tabular-nums"
            :class="tabActual === 'me_deben' ? 'text-red-400' : 'text-emerald-400'"
          >{{ currencySymbol }} {{ formatMonto(montoOpuesto) }}</strong>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Balance neto -->
        <span class="inline-flex items-center gap-1.5 text-xs">
          <span class="text-theme-text-muted">Balance:</span>
          <strong
            class="font-semibold tabular-nums"
            :class="resumen.balanceNeto >= 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ resumen.balanceNeto >= 0 ? '+' : '' }}{{ currencySymbol }} {{ formatMonto(resumen.balanceNeto) }}
          </strong>
        </span>

        <!-- Tendencia mes -->
        <span
          v-if="tendencia !== null && tendencia !== 0"
          class="inline-flex items-center gap-1 text-xs"
          :class="tendencia > 0 ? 'text-emerald-400' : 'text-red-400'"
        >
          <svg v-if="tendencia > 0" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
          <span class="font-semibold">vs mes pasado</span>
        </span>
      </div>
    </div>

    <!-- Banner de vencidas (sticky-ish, sin esconder) -->
    <button
      v-if="countVencidas > 0"
      class="w-full mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 text-left transition-colors tap-44"
      @click="toggleFiltroVencidas"
    >
      <div class="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 text-lg">⚠</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-red-400">
          {{ countVencidas }} deuda{{ countVencidas !== 1 ? 's' : '' }} vencida{{ countVencidas !== 1 ? 's' : '' }}
        </p>
        <p v-if="primeraVencida" class="text-xs text-red-400/80 truncate mt-0.5">
          {{ primeraVencida.nombre }} · <strong class="font-semibold">{{ currencySymbol }} {{ formatMonto(primeraVencida.totalPendiente) }}</strong>
        </p>
      </div>
      <span class="px-3 h-9 rounded-lg bg-red-500 text-white text-xs font-bold flex items-center tap-44">
        {{ filtroEstado === 'vencidas' ? 'Quitar' : 'Ver' }}
      </span>
    </button>
  </div>
</template>

<script setup>
const { resumen, tabActual, cambiarTab, filtroEstado, personas } = useDeudas()

const totalGeneral = computed(() => resumen.value.totalMeDeben + resumen.value.totalYoDebo)
const porcentajeMeDeben = computed(() => {
  if (totalGeneral.value === 0) return 50
  return (resumen.value.totalMeDeben / totalGeneral.value) * 100
})

const montoActual = computed(() => tabActual.value === 'me_deben' ? resumen.value.totalMeDeben : resumen.value.totalYoDebo)
const montoOpuesto = computed(() => tabActual.value === 'me_deben' ? resumen.value.totalYoDebo : resumen.value.totalMeDeben)
const countActual = computed(() => tabActual.value === 'me_deben' ? resumen.value.countMeDeben : resumen.value.countYoDebo)
const countVencidas = computed(() => tabActual.value === 'me_deben' ? resumen.value.countVencidasMeDeben : resumen.value.countVencidasYoDebo)

const primeraVencida = computed(() => {
  const c = (personas.value || []).filter(p => p.tieneVencidas)
  if (!c.length) return null
  return [...c].sort((a, b) => (b.totalPendiente || 0) - (a.totalPendiente || 0))[0]
})

function toggleFiltroVencidas() {
  filtroEstado.value = filtroEstado.value === 'vencidas' ? 'todos' : 'vencidas'
}
function toggleTab() {
  cambiarTab(tabActual.value === 'me_deben' ? 'yo_debo' : 'me_deben')
}

const { currencySymbol, formatMonto } = useCurrency()

const SNAPSHOT_KEY = 'deudas-balance-snapshot'
const tendencia = ref(null)

function actualizarTendencia() {
  if (!import.meta.client) return
  const balance = resumen.value.balanceNeto
  const hoyStr = useFechaPeru().fechaHoy()
  const [a, m] = hoyStr.split('-')
  const mesActual = `${a}-${parseInt(m, 10)}`
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    const snapshot = raw ? JSON.parse(raw) : null
    if (snapshot && snapshot.mes !== mesActual) tendencia.value = balance - snapshot.balance
    if (!snapshot || snapshot.mes !== mesActual) {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ mes: mesActual, balance }))
    }
  } catch { /* sin storage */ }
}

watch(() => resumen.value.balanceNeto, actualizarTendencia)
onMounted(actualizarTendencia)
</script>
