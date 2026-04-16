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
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/25 to-indigo-500/15 flex items-center justify-center border border-[var(--color-accent)]/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
        v-if="futureProjects > 0"
        to="/planificador"
        class="bg-theme-card rounded-2xl p-4 border border-sky-500/20 block active:bg-theme-border-md transition-colors lg:col-span-1"
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
          <span class="text-[10px] text-sky-400">{{ futureProjects }} proyecto{{ futureProjects !== 1 ? 's' : '' }} →</span>
        </div>
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
      </NuxtLink>
    </div>

    <div class="flex-1"></div>

    <!-- Botón de Información -->
    <div class="px-5 mt-4">
      <NuxtLink
        to="/informacion"
        class="flex items-center justify-between gap-3 rounded-2xl p-3.5 border border-theme-border bg-theme-card active:bg-theme-border-md transition-colors"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-theme-accent-bg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-theme-text">Información</p>
            <p class="text-[11px] text-theme-text-muted">Cómo funciona cada módulo</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </NuxtLink>
    </div>

    <!-- Settings link -->
    <div class="px-5 py-5">
      <NuxtLink
        to="/configuraciones"
        class="group flex items-center justify-center gap-2 w-full py-3 rounded-xl glass-card text-theme-text-sec text-sm hover:text-theme-text-sec transition-all duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform duration-500 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configuraciones
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { currencySymbol, formatMonto } = useCurrency()
const { formatMesAnio } = useFormatters()
const { toggle: toggleDrawer } = useMobileDrawer()

// Saludo dinámico
const saludo = computed(() => {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 18) return 'Buenas tardes'
  return 'Buenas noches'
})

const hoy = new Date()
const mesActualNum = hoy.getMonth() + 1
const anioActual = hoy.getFullYear()
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

// Estados de error por card (A3)
const errorGastos = ref(false)
const errorDeudas = ref(false)
const errorPlan = ref(false)

// Estados de carga por card (C1)
const loadingGastos = ref(true)
const loadingDeudas = ref(true)
const loadingPlan = ref(true)

const porcentajeGastado = computed(() => {
  if (presupuesto.value <= 0) return 0
  return (totalMes.value / presupuesto.value) * 100
})

const saldoRestante = computed(() => presupuesto.value - totalMes.value)

const porcentajePlanPagado = computed(() => {
  if (countTotal.value === 0) return 0
  return (countPagados.value / countTotal.value) * 100
})

onMounted(async () => {
  // Cargar en paralelo
  await Promise.allSettled([
    cargarResumenGastos(),
    cargarResumenDeudas(),
    cargarResumenPlan(),
  ])
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
</script>