<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header with gradient accent -->
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/8 rounded-full blur-3xl"></div>

      <div class="relative flex items-center gap-3 mb-1">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-500/15 flex items-center justify-center border border-blue-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gradient-blue">Mis Finanzas</h1>
          <p class="text-[11px] text-gray-500 mt-0.5">{{ saludo }}, bienvenido de vuelta</p>
        </div>
      </div>
    </div>

    <!-- Dashboard summary cards -->
    <div class="px-5 mb-4 space-y-2.5">
      <!-- Gasto del mes vs presupuesto -->
      <div class="bg-gradient-to-br from-primary-800 to-primary-800/80 rounded-2xl p-4 border border-primary-700/20">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-gray-400 font-medium">Gasto de {{ mesActual }}</span>
          <NuxtLink to="/registro" class="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Ver detalle →</NuxtLink>
        </div>
        <div class="flex items-end justify-between mb-2">
          <p class="text-2xl font-bold text-gradient-blue">{{ currencySymbol }} {{ formatMonto(totalMes) }}</p>
          <p v-if="presupuesto > 0" class="text-sm text-gray-400">
            de {{ currencySymbol }} {{ formatMonto(presupuesto) }}
          </p>
        </div>
        <div v-if="presupuesto > 0">
          <div class="w-full h-1.5 bg-primary-900/60 rounded-full overflow-hidden mb-1">
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
            <span class="text-[10px] text-gray-500">{{ porcentajeGastado.toFixed(0) }}%</span>
          </div>
        </div>
        <p v-else class="text-[10px] text-gray-600">Sin presupuesto configurado para este mes</p>
      </div>

      <!-- Fila: Deudas + Planificador -->
      <div class="grid grid-cols-2 gap-2.5">
        <!-- Deudas pendientes -->
        <NuxtLink to="/deudas" class="bg-primary-800 rounded-2xl p-3.5 border border-primary-700/20 block active:bg-primary-700/50 transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <span class="text-[10px] text-gray-400 font-medium">Me deben</span>
          </div>
          <p class="text-lg font-bold text-amber-400">{{ currencySymbol }} {{ formatMonto(totalMeDeben) }}</p>
          <p class="text-[10px] text-gray-600 mt-0.5">{{ countMeDeben }} persona{{ countMeDeben !== 1 ? 's' : '' }}</p>
        </NuxtLink>

        <!-- Plan del mes -->
        <NuxtLink to="/planificador" class="bg-primary-800 rounded-2xl p-3.5 border border-primary-700/20 block active:bg-primary-700/50 transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <span class="text-[10px] text-gray-400 font-medium">Plan</span>
          </div>
          <p class="text-lg font-bold" :class="porcentajePlanPagado > 70 ? 'text-emerald-400' : 'text-blue-400'">
            {{ porcentajePlanPagado.toFixed(0) }}%
          </p>
          <p class="text-[10px] text-gray-600 mt-0.5">{{ countPagados }}/{{ countTotal }} pagados</p>
        </NuxtLink>
      </div>
    </div>

    <!-- Quick access modules -->
    <div class="px-5 space-y-2.5 flex-1">
      <NuxtLink
        v-for="(modulo, idx) in modulos"
        :key="modulo.to"
        :to="modulo.to"
        class="group flex items-center gap-4 rounded-2xl p-3.5 transition-all duration-300 active:scale-[0.98] module-card border border-primary-700/20 bg-primary-800/60"
        :style="{ animationDelay: `${idx * 60}ms` }"
      >
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
          :class="modulo.iconBg"
        >
          <component :is="modulo.icon" class="w-5 h-5" :class="modulo.iconColor" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-white">{{ modulo.titulo }}</p>
          <p class="text-xs text-gray-500 truncate">{{ modulo.descripcion }}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-600 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </NuxtLink>
    </div>

    <!-- Settings link -->
    <div class="px-5 py-5">
      <NuxtLink
        to="/configuraciones"
        class="group flex items-center justify-center gap-2 w-full py-3 rounded-xl glass-card text-gray-500 text-sm hover:text-gray-300 transition-all duration-300"
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

const porcentajeGastado = computed(() => {
  if (presupuesto.value <= 0) return 0
  return (totalMes.value / presupuesto.value) * 100
})

const saldoRestante = computed(() => presupuesto.value - totalMes.value)

const porcentajePlanPagado = computed(() => {
  if (countTotal.value === 0) return 0
  return (countPagados.value / countTotal.value) * 100
})

// Icons
const IconClipboard = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>`
}
const IconMic = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>`
}
const IconCreditCard = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>`
}

const modulos = [
  {
    to: '/planificador',
    icon: IconClipboard,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    titulo: 'Planificador',
    descripcion: 'Organiza tu presupuesto mensual por categoría',
  },
  {
    to: '/registro',
    icon: IconMic,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    titulo: 'Registro de Gastos',
    descripcion: 'Registra gastos por voz o manualmente',
  },
  {
    to: '/deudas',
    icon: IconCreditCard,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    titulo: 'Deudas y Pagos',
    descripcion: 'Controla quién te debe y a quién le debes',
  },
]

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
    const data = await $fetch('/api/gastos/resumen', {
      query: { mes: mesActualNum, anio: anioActual }
    })
    totalMes.value = parseFloat(data.totalMes) || 0

    // Obtener presupuesto del planificador
    const plan = await $fetch('/api/planificador', {
      query: { mes: mesActualNum, anio: anioActual }
    })
    presupuesto.value = parseFloat(plan.plan?.montoPresupuesto) || 0
  } catch { /* silencioso */ }
}

async function cargarResumenDeudas() {
  try {
    const data = await $fetch('/api/deudas/resumen')
    totalMeDeben.value = parseFloat(data.totalMeDeben) || 0
    countMeDeben.value = data.countMeDeben || 0
  } catch { /* silencioso */ }
}

async function cargarResumenPlan() {
  try {
    const data = await $fetch('/api/planificador', {
      query: { mes: mesActualNum, anio: anioActual }
    })
    const gastos = data.gastos || []
    countTotal.value = gastos.length
    countPagados.value = gastos.filter(g => g.estado === 'pagado').length
  } catch { /* silencioso */ }
}
</script>

<style scoped>
.module-card {
  animation: fadeInUp 0.4s ease-out both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
