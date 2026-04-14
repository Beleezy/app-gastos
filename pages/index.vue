<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header with gradient accent -->
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-theme-accent-bg rounded-full blur-3xl"></div>

      <div class="relative flex items-center gap-3 mb-1">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/25 to-indigo-500/15 flex items-center justify-center border border-[var(--color-accent)]/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gradient-blue">Mis Finanzas</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">{{ saludo }}, bienvenido de vuelta</p>
        </div>
      </div>
    </div>

    <!-- Dashboard summary cards -->
    <div class="px-5 mb-4 space-y-2.5">
      <!-- Gasto del mes vs presupuesto -->
      <div class="bg-gradient-to-br from-theme-card to-theme-card/80 rounded-2xl p-4 border border-theme-border">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-theme-text-muted font-medium">Gasto de {{ mesActual }}</span>
          <NuxtLink to="/registro" class="text-[10px] text-theme-accent hover:text-theme-accent-light transition-colors">Ver detalle →</NuxtLink>
        </div>
        <div class="flex items-end justify-between mb-2">
          <p class="text-2xl font-bold text-gradient-blue">{{ currencySymbol }} {{ formatMonto(totalMes) }}</p>
          <p v-if="presupuesto > 0" class="text-sm text-theme-text-muted">
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
      <div class="grid grid-cols-2 gap-2.5">
        <!-- Deudas pendientes -->
        <NuxtLink to="/deudas" class="bg-theme-card rounded-2xl p-3.5 border border-theme-border block active:bg-theme-border-md transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <span class="text-[10px] text-theme-text-muted font-medium">Me deben</span>
          </div>
          <p class="text-lg font-bold text-amber-400">{{ currencySymbol }} {{ formatMonto(totalMeDeben) }}</p>
          <p class="text-[10px] text-theme-text-muted mt-0.5">{{ countMeDeben }} persona{{ countMeDeben !== 1 ? 's' : '' }}</p>
        </NuxtLink>

        <!-- Plan del mes -->
        <NuxtLink to="/planificador" class="bg-theme-card rounded-2xl p-3.5 border border-theme-border block active:bg-theme-border-md transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-theme-accent-bg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <span class="text-[10px] text-theme-text-muted font-medium">Plan mensual</span>
          </div>
          <p class="text-lg font-bold" :class="porcentajePlanPagado > 70 ? 'text-emerald-400' : 'text-theme-accent'">
            {{ porcentajePlanPagado.toFixed(0) }}%
          </p>
          <p class="text-[10px] text-theme-text-muted mt-0.5">{{ countPagados }}/{{ countTotal }} pagados</p>
        </NuxtLink>
      </div>

      <!-- Gastos futuros -->
      <NuxtLink
        v-if="futureProjects > 0"
        to="/planificador"
        class="bg-theme-card rounded-2xl p-4 border border-sky-500/20 block active:bg-theme-border-md transition-colors"
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

    <!-- Quick access modules -->
    <div class="px-5 space-y-2.5 flex-1">
      <NuxtLink
        v-for="(modulo, idx) in modulos"
        :key="modulo.to"
        :to="modulo.to"
        class="group flex items-center gap-4 rounded-2xl p-3.5 transition-all duration-300 active:scale-[0.98] module-card border border-theme-border bg-theme-card"
        :style="{ animationDelay: `${idx * 60}ms` }"
      >
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
          :class="modulo.iconBg"
        >
          <component :is="modulo.icon" class="w-5 h-5" :class="modulo.iconColor" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-theme-text">{{ modulo.titulo }}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </NuxtLink>
    </div>

    <!-- Información de módulos -->
    <div class="px-5 mt-4 mb-2">
      <div class="rounded-2xl border border-theme-border bg-theme-card overflow-hidden">
        <div class="px-4 py-3 border-b border-theme-border flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span class="text-xs font-semibold text-theme-text">Información</span>
        </div>
        <div
          v-for="(modulo, idx) in modulos"
          :key="modulo.to + '-info'"
          class="px-4 py-3"
          :class="{ 'border-t border-theme-border': idx > 0 }"
        >
          <div class="flex items-center gap-2 mb-1">
            <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0" :class="modulo.iconBg">
              <component :is="modulo.icon" class="w-3 h-3" :class="modulo.iconColor" />
            </div>
            <p class="text-xs font-semibold text-theme-text">{{ modulo.titulo }}</p>
          </div>
          <p class="text-[11px] text-theme-text-muted leading-relaxed pl-7">{{ modulo.descripcion }}</p>
        </div>
      </div>
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

const porcentajeGastado = computed(() => {
  if (presupuesto.value <= 0) return 0
  return (totalMes.value / presupuesto.value) * 100
})

const saldoRestante = computed(() => presupuesto.value - totalMes.value)

const porcentajePlanPagado = computed(() => {
  if (countTotal.value === 0) return 0
  return (countPagados.value / countTotal.value) * 100
})

// Icons usando render functions (evita necesitar el compilador Vue en runtime)
import { h } from 'vue'

const makeIcon = (d) => () => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
  'stroke-width': '1.75',
  stroke: 'currentColor'
}, [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d })])

const IconClipboard = makeIcon('M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z')
const IconMic = makeIcon('M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z')
const IconCreditCard = makeIcon('M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z')

const modulos = [
  {
    to: '/planificador',
    icon: IconClipboard,
    iconBg: 'bg-theme-accent-bg',
    iconColor: 'text-theme-accent',
    titulo: 'Planificador',
    descripcion: 'Aquí defines tu presupuesto mensual y distribuyes tus gastos planificados por categoría. Es una hoja de ruta: anota cuánto piensas gastar en cada cosa y marca los ítems conforme los vas pagando.',
  },
  {
    to: '/registro',
    icon: IconMic,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    titulo: 'Registro de Gastos',
    descripcion: 'Registra tus gastos reales del día a día, ya sea dictando por voz o ingresándolos manualmente. La IA interpreta lo que dices y extrae automáticamente el monto, la categoría y la fecha.',
  },
  {
    to: '/deudas',
    icon: IconCreditCard,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    titulo: 'Deudas y Pagos',
    descripcion: 'Lleva el control de lo que te deben y lo que debes. Puedes registrar múltiples conceptos por persona, hacer pagos parciales y ver el historial de cada deuda.',
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
