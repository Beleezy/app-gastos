<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header with gradient accent -->
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-theme-accent-bg rounded-full blur-3xl"></div>

      <div class="relative flex items-center gap-3 mb-1">
        <button
          class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          @click="toggleDrawer"
          title="Menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center">
          <img src="/favicon.svg" alt="Mis Finanzas" class="w-11 h-11" />
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-gradient-blue">Mis Finanzas</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">{{ saludo }}, bienvenido de vuelta</p>
        </div>
      </div>
    </div>

    <!-- Dashboard summary cards -->
    <div class="px-5 lg:px-0 mb-4 space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
      <!-- Gasto del mes vs presupuesto -->
      <div class="bg-gradient-to-br from-theme-card to-theme-card/80 rounded-2xl p-4 border border-theme-border lg:col-span-3">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-theme-text-muted font-medium flex items-center gap-1.5">
            Gasto de {{ mesActual }}
            <span v-if="errorGastos" title="No se pudo cargar" class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/15 text-red-400 text-[9px] font-bold">!</span>
          </span>
          <NuxtLink to="/registro" class="text-[10px] text-theme-accent hover:text-theme-accent-light transition-colors">Ver detalle →</NuxtLink>
        </div>
        <div class="flex items-end justify-between mb-2">
          <div v-if="loadingGastos" class="h-7 w-32 rounded-md bg-theme-border-md shimmer"></div>
          <p v-else class="text-2xl font-bold text-gradient-blue">{{ currencySymbol }} {{ formatMonto(totalMes) }}</p>
          <p v-if="!loadingGastos && presupuesto > 0" class="text-sm text-theme-text-muted">
            de {{ currencySymbol }} {{ formatMonto(presupuesto) }}
          </p>
        </div>
        <div v-if="presupuesto > 0">
          <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden mb-1">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="porcentajeGastado > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : porcentajeGastado > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
              :style="{ width: Math.min(porcentajeGastado, 100) + '%' }"
            ></div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px]" :class="saldoRestante >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ saldoRestante >= 0 ? 'Disponible' : 'Excedido' }}: {{ currencySymbol }} {{ formatMonto(Math.abs(saldoRestante)) }}
            </span>
            <span class="text-[10px] text-theme-text-sec">{{ porcentajeGastado.toFixed(0) }}%</span>
          </div>
        </div>
        <p v-else class="text-[10px] text-theme-text-muted">Sin presupuesto configurado para este mes</p>
      </div>

      <!-- Fila: Deudas + Plan -->
      <div class="grid grid-cols-2 gap-2.5 lg:contents">
        <!-- Deudas pendientes -->
        <NuxtLink to="/deudas" class="bg-theme-card rounded-2xl p-3.5 border border-theme-border block active:bg-theme-border-md transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <span class="text-[10px] text-theme-text-muted font-medium flex items-center gap-1">
              Me deben
              <span v-if="errorDeudas" title="No se pudo cargar" class="inline-flex h-3 w-3 items-center justify-center rounded-full bg-red-500/15 text-red-400 text-[8px] font-bold">!</span>
            </span>
          </div>
          <div v-if="loadingDeudas" class="h-5 w-20 rounded-md bg-theme-border-md shimmer"></div>
          <p v-else class="text-lg font-bold text-amber-400">{{ currencySymbol }} {{ formatMonto(totalMeDeben) }}</p>
          <p v-if="!loadingDeudas" class="text-[10px] text-theme-text-muted mt-0.5">{{ countMeDeben }} persona{{ countMeDeben !== 1 ? 's' : '' }}</p>
          <div v-else class="h-3 w-12 rounded bg-theme-border-md shimmer mt-1"></div>
        </NuxtLink>

        <!-- Plan del mes -->
        <NuxtLink to="/planificador" class="bg-theme-card rounded-2xl p-3.5 border border-theme-border block active:bg-theme-border-md transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-theme-accent-bg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <span class="text-[10px] text-theme-text-muted font-medium flex items-center gap-1">
              Plan mensual
              <span v-if="errorPlan" title="No se pudo cargar" class="inline-flex h-3 w-3 items-center justify-center rounded-full bg-red-500/15 text-red-400 text-[8px] font-bold">!</span>
            </span>
          </div>
          <div v-if="loadingPlan" class="h-5 w-14 rounded-md bg-theme-border-md shimmer"></div>
          <p v-else class="text-lg font-bold" :class="porcentajePlanPagado > 70 ? 'text-emerald-400' : 'text-theme-accent'">
            {{ porcentajePlanPagado.toFixed(0) }}%
          </p>
          <p v-if="!loadingPlan" class="text-[10px] text-theme-text-muted mt-0.5">{{ countPagados }}/{{ countTotal }} pagados</p>
          <div v-else class="h-3 w-16 rounded bg-theme-border-md shimmer mt-1"></div>
        </NuxtLink>
      </div>

      <!-- Gastos futuros -->
      <NuxtLink
        to="/futuros"
        class="bg-theme-card rounded-2xl p-4 border block active:bg-theme-border-md transition-colors lg:col-span-1"
        :class="futureProjects > 0 ? 'border-sky-500/20' : 'border-dashed border-theme-border'"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <span class="text-xs font-semibold text-theme-text">Gastos futuros</span>
          </div>
          <span v-if="futureProjects > 0" class="text-[10px] text-sky-400">{{ futureProjects }} proyecto{{ futureProjects !== 1 ? 's' : '' }} →</span>
          <span v-else class="text-[10px] text-sky-400">Comenzar →</span>
        </div>
        <template v-if="futureProjects > 0">
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-xl bg-theme-input px-3 py-2">
              <p class="text-[10px] text-theme-text-muted">Min</p>
              <p class="mt-0.5 text-xs font-semibold text-emerald-400">{{ currencySymbol }} {{ formatMonto(futureMin) }}</p>
            </div>
            <div class="rounded-xl bg-sky-500/10 px-3 py-2">
              <p class="text-[10px] text-sky-300/70">Promedio</p>
              <p class="mt-0.5 text-xs font-semibold text-sky-300">{{ currencySymbol }} {{ formatMonto(futureAverage) }}</p>
            </div>
            <div class="rounded-xl bg-theme-input px-3 py-2">
              <p class="text-[10px] text-theme-text-muted">Max</p>
              <p class="mt-0.5 text-xs font-semibold text-amber-300">{{ currencySymbol }} {{ formatMonto(futureMax) }}</p>
            </div>
          </div>
          <div v-if="futureHighlights.length" class="mt-2.5 flex flex-wrap gap-1.5">
            <span
              v-for="item in futureHighlights"
              :key="item.id"
              class="rounded-full bg-theme-input px-2.5 py-1 text-[10px] text-theme-text-sec"
            >
              {{ item.tipoGasto }}
            </span>
          </div>
        </template>
        <template v-else>
          <p class="text-[11px] text-theme-text-sec leading-relaxed">
            Planifica tus deseos y compara opciones antes de decidir.
          </p>
          <p class="mt-1.5 text-[10px] text-sky-400 font-medium">
            Agrega tu primer proyecto →
          </p>
        </template>
      </NuxtLink>

      <!-- Ingresos / Saldo neto -->
      <NuxtLink
        to="/ingresos"
        class="bg-theme-card rounded-2xl p-4 border block active:bg-theme-border-md transition-colors lg:col-span-1"
        :class="totalIngresosMes > 0 ? 'border-emerald-500/20' : 'border-dashed border-theme-border'"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <span class="text-base leading-none">💰</span>
            </div>
            <span class="text-xs font-semibold text-theme-text">Ingresos</span>
          </div>
          <span class="text-[10px] text-emerald-400">{{ totalIngresosMes > 0 ? 'Ver detalle →' : 'Empezar →' }}</span>
        </div>
        <template v-if="totalIngresosMes > 0">
          <p class="text-lg font-bold text-emerald-400">{{ currencySymbol }} {{ formatMonto(totalIngresosMes) }}</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-[10px] text-theme-text-muted">Saldo neto</span>
            <span class="text-[11px] font-semibold" :class="saldoNetoMes >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ currencySymbol }} {{ formatMonto(saldoNetoMes) }}
            </span>
          </div>
        </template>
        <template v-else>
          <p class="text-[11px] text-theme-text-sec leading-relaxed">
            Registra ingresos para ver tu saldo neto del mes.
          </p>
          <p class="mt-1.5 text-[10px] text-emerald-400 font-medium">Registrar ingreso →</p>
        </template>
      </NuxtLink>

      <!-- Resumen de ahorros -->
      <NuxtLink
        to="/ahorros"
        class="bg-theme-card rounded-2xl p-4 border block active:bg-theme-border-md transition-colors lg:col-span-1"
        :class="(ahorrosTotalGlobal > 0 || ahorrosTotalMes > 0) ? 'border-emerald-500/20' : 'border-dashed border-theme-border'"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <span class="text-xs font-semibold text-theme-text">Ahorros</span>
          </div>
          <span v-if="ahorrosTotalGlobal > 0 || ahorrosTotalMes > 0" class="text-[10px] text-emerald-400">Ver detalle →</span>
          <span v-else class="text-[10px] text-emerald-400">Empezar →</span>
        </div>
        <template v-if="!loadingAhorros && (ahorrosTotalGlobal > 0 || ahorrosTotalMes > 0)">
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl bg-theme-input px-3 py-2">
              <p class="text-[10px] text-theme-text-muted">Este mes</p>
              <p class="mt-0.5 text-sm font-semibold text-emerald-400">{{ currencySymbol }} {{ formatMonto(ahorrosTotalMes) }}</p>
            </div>
            <div class="rounded-xl bg-emerald-500/10 px-3 py-2">
              <p class="text-[10px] text-emerald-300/70">Total acumulado</p>
              <p class="mt-0.5 text-sm font-semibold text-emerald-300">{{ currencySymbol }} {{ formatMonto(ahorrosTotalGlobal) }}</p>
            </div>
          </div>
          <div v-if="ahorrosMetaMensual && ahorrosTotalMes > 0" class="mt-2.5">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-theme-text-muted">Meta mensual</span>
              <span class="text-[10px] text-emerald-400">{{ ahorrosProgresoMensual.toFixed(0) }}%</span>
            </div>
            <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                :style="{ width: Math.min(ahorrosProgresoMensual, 100) + '%' }"
              ></div>
            </div>
          </div>
          <div v-if="ahorrosPorMedio.length" class="mt-2.5 flex flex-wrap gap-1.5">
            <span
              v-for="medio in ahorrosPorMedio"
              :key="medio.medioAhorroId"
              class="rounded-full bg-theme-input px-2.5 py-1 text-[10px] text-theme-text-sec flex items-center gap-1"
            >
              <span v-if="medio.medioIcono">{{ medio.medioIcono }}</span>
              {{ medio.medioNombre }}: {{ currencySymbol }} {{ formatMonto(medio.total) }}
            </span>
          </div>
        </template>
        <template v-else-if="!loadingAhorros">
          <p class="text-[11px] text-theme-text-sec leading-relaxed">
            Aparta dinero para tus metas mes a mes y mira tu progreso.
          </p>
          <p class="mt-1.5 text-[10px] text-emerald-400 font-medium">
            Crea tu primera meta →
          </p>
        </template>
        <div v-else class="h-12 w-full rounded-xl bg-theme-border-md shimmer"></div>
      </NuxtLink>
    </div>

    <!-- Configuraciones -->
    <div class="px-5 lg:px-0 mt-4 mb-2 lg:mb-3">
      <NuxtLink
        to="/configuraciones"
        class="flex items-center gap-2.5 rounded-2xl p-3 border border-theme-border bg-theme-card active:bg-theme-border-md transition-colors"
      >
        <div class="w-8 h-8 rounded-lg bg-theme-input flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-semibold text-theme-text">Configuraciones</p>
          <p class="text-[10px] text-theme-text-muted truncate">Perfil y preferencias</p>
        </div>
      </NuxtLink>
    </div>

    <!-- Información -->
    <div class="px-5 lg:px-0 mb-5">
      <NuxtLink
        to="/informacion"
        class="flex items-center gap-2.5 rounded-2xl p-3 border border-theme-border bg-theme-card active:bg-theme-border-md transition-colors"
      >
        <div class="w-8 h-8 rounded-lg bg-theme-input flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-semibold text-theme-text">Información</p>
          <p class="text-[10px] text-theme-text-muted truncate">Cómo funciona</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { currencySymbol, formatMonto } = useCurrency()
const { formatMesAnio } = useFormatters()
const { toggle: toggleDrawer } = useMobileDrawer()

const { ahora: ahoraPeru } = useFechaPeru()

// Saludo dinámico
const saludo = computed(() => {
  const hora = parseInt(ahoraPeru().hora.split(':')[0], 10)
  if (hora < 12) return 'Buenos días'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
})

const hoyStr = ahoraPeru().fecha
const [anioActual, mesActualNum] = hoyStr.split('-').map(Number)
const mesActual = formatMesAnio(mesActualNum, anioActual)

// State
const totalMes = ref(0)
const presupuesto = ref(0)
const totalMeDeben = ref(0)
const countMeDeben = ref(0)
const countPagados = ref(0)
const countTotal = ref(0)
const futureProjects = ref(0)
const futureAverage = ref(0)
const futureMin = ref(0)
const futureMax = ref(0)
const futureHighlights = ref([])

// Ahorros
const ahorrosTotalMes = ref(0)
const ahorrosTotalGlobal = ref(0)
const ahorrosMetaMensual = ref(null)
const ahorrosProgresoMensual = ref(0)
const ahorrosPorMedio = ref([])

// Ingresos
const totalIngresosMes = ref(0)
const saldoNetoMes = ref(0)

// Estados de error por card (A3)
const errorGastos = ref(false)
const errorDeudas = ref(false)
const errorPlan = ref(false)

// Estados de carga por card (C1)
const loadingGastos = ref(true)
const loadingDeudas = ref(true)
const loadingPlan = ref(true)
const loadingAhorros = ref(true)

const porcentajeGastado = computed(() => {
  if (presupuesto.value <= 0) return 0
  return (totalMes.value / presupuesto.value) * 100
})

const saldoRestante = computed(() => presupuesto.value - totalMes.value)

const porcentajePlanPagado = computed(() => {
  if (countTotal.value === 0) return 0
  return (countPagados.value / countTotal.value) * 100
})

onMounted(() => {
  // Disparar fetches en paralelo sin esperar: cada card maneja su propio
  // skeleton/loading. Antes el `await Promise.allSettled` retrasaba el
  // TTI ~200-300ms en PWA fría hasta que TODAS las requests resolvieran.
  // Ahora el dashboard se monta inmediato y los datos llenan las cards
  // a medida que llegan. El menos crítico (ahorros) se difiere para que
  // no compita con los otros tres por el main thread.
  cargarResumenGastos().catch(() => {})
  cargarResumenDeudas().catch(() => {})
  cargarResumenPlan().catch(() => {})
  setTimeout(() => cargarResumenAhorros().catch(() => {}), 250)
  setTimeout(() => cargarResumenIngresos().catch(() => {}), 350)
})

async function cargarResumenGastos() {
  try {
    errorGastos.value = false
    const data = await $fetch('/api/gastos/resumen', {
      query: { mes: mesActualNum, anio: anioActual }
    })
    totalMes.value = parseFloat(data.totalMes) || 0
  } catch (e) {
    errorGastos.value = true
    console.warn('[dashboard] cargarResumenGastos falló:', e)
  } finally {
    loadingGastos.value = false
  }
}

async function cargarResumenDeudas() {
  try {
    errorDeudas.value = false
    const data = await $fetch('/api/deudas/resumen')
    totalMeDeben.value = parseFloat(data.totalMeDeben) || 0
    countMeDeben.value = data.countMeDeben || 0
  } catch (e) {
    errorDeudas.value = true
    console.warn('[dashboard] cargarResumenDeudas falló:', e)
  } finally {
    loadingDeudas.value = false
  }
}

async function cargarResumenPlan() {
  try {
    errorPlan.value = false
    const data = await $fetch('/api/planificador', {
      query: { mes: mesActualNum, anio: anioActual }
    })
    presupuesto.value = parseFloat(data.plan?.montoPresupuesto) || 0
    const gastos = data.gastos || []
    countTotal.value = gastos.length
    countPagados.value = gastos.filter(g => g.estado === 'pagado').length

    const futuros = data.resumenFuturos || {}
    futureProjects.value = futuros.totalProyectos || 0
    futureAverage.value = parseFloat(futuros.totalPromedio) || 0
    futureMin.value = parseFloat(futuros.totalMinimo) || 0
    futureMax.value = parseFloat(futuros.totalMaximo) || 0
    futureHighlights.value = Array.isArray(futuros.destacados) ? futuros.destacados.slice(0, 2) : []
  } catch (e) {
    errorPlan.value = true
    console.warn('[dashboard] cargarResumenPlan falló:', e)
  } finally {
    loadingPlan.value = false
  }
}

async function cargarResumenIngresos() {
  try {
    const data = await $fetch('/api/ingresos/resumen', {
      query: { mes: mesActualNum, anio: anioActual }
    })
    totalIngresosMes.value = parseFloat(data.totalIngresos) || 0
    saldoNetoMes.value = parseFloat(data.saldoNeto) || 0
  } catch (e) {
    console.warn('[dashboard] cargarResumenIngresos falló:', e)
  }
}

async function cargarResumenAhorros() {
  try {
    const data = await $fetch('/api/ahorros', {
      query: { mes: mesActualNum, anio: anioActual }
    })
    ahorrosTotalMes.value = parseFloat(data.totalMes) || 0
    ahorrosTotalGlobal.value = parseFloat(data.totalGlobal) || 0
    ahorrosMetaMensual.value = data.metaMensual
    ahorrosProgresoMensual.value = data.progresoMensual || 0
    ahorrosPorMedio.value = (data.porMedio || []).filter(m => m.total > 0)
  } catch (e) {
    console.warn('[dashboard] cargarResumenAhorros falló:', e)
  } finally {
    loadingAhorros.value = false
  }
}
</script>