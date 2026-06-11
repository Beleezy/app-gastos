<template>
  <div class="px-4 pt-3 pb-32">
    <Preview3PageHeader icon="👋" title="Hola de nuevo" :subtitle="`Tu resumen de ${mesLabel}`" />

    <div v-if="loading" class="space-y-3">
      <div class="h-36 rounded-3xl bg-theme-card shimmer"></div>
      <div class="grid grid-cols-2 gap-2.5">
        <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
        <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
      </div>
      <div class="h-44 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- HERO: gasto del mes -->
      <button
        class="relative w-full text-left overflow-hidden rounded-3xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-5 mb-3 active:scale-[0.99] transition-transform"
        @click="$emit('ir', 'registro')"
      >
        <div
          class="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none"
          :class="excedido ? 'bg-red-500/10' : porcentaje > 70 ? 'bg-amber-500/10' : 'bg-theme-accent-bg'"
        ></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-1.5 gap-2">
            <span class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Gasto del mes</span>
            <span class="text-[0.7rem] text-theme-accent font-semibold shrink-0">Ver registro →</span>
          </div>
          <Preview3Money
            :value="d.gastos.totalMes"
            class="font-extrabold leading-none text-gradient-blue"
            :style="heroFontStyle"
          />
          <p v-if="presupuesto > 0" class="text-[0.74rem] text-theme-text-muted mt-1">
            de <Preview3Money :value="presupuesto" entero /> presupuestados
          </p>

          <div v-if="presupuesto > 0" class="mt-3">
            <div class="h-2 w-full rounded-full bg-theme-input overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="excedido ? 'bg-gradient-to-r from-red-500 to-rose-400' : porcentaje > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
                :style="{ width: Math.min(porcentaje, 100) + '%' }"
              ></div>
            </div>
            <div class="flex items-center justify-between mt-1.5 gap-2">
              <span class="text-[0.72rem] font-semibold min-w-0" :class="excedido ? 'text-red-400' : 'text-emerald-400'">
                {{ excedido ? 'Excedido' : 'Disponible' }}:
                <Preview3Money :value="Math.abs(saldo)" :tone="excedido ? 'red' : 'green'" />
              </span>
              <span class="text-[0.72rem] text-theme-text-sec font-medium tabular-nums shrink-0">{{ porcentaje.toFixed(0) }}%</span>
            </div>
          </div>
          <p v-else class="mt-2 text-[0.72rem] text-theme-text-muted">Sin presupuesto configurado este mes</p>
        </div>
      </button>

      <!-- 2 col: Me deben / Plan -->
      <div class="grid grid-cols-2 gap-2.5 mb-3">
        <button
          class="rounded-2xl border border-theme-border bg-theme-card p-4 text-left active:scale-[0.98] transition-transform"
          @click="$emit('ir', 'deudas')"
        >
          <div class="flex items-center gap-1.5 mb-2">
            <span class="text-sm">💳</span>
            <span class="text-[0.62rem] uppercase tracking-wider font-bold text-theme-text-muted">Me deben</span>
          </div>
          <Preview3Money :value="d.deudas.totalMeDeben" compact entero tone="amber" class="text-lg font-extrabold" />
          <p class="text-[0.68rem] text-theme-text-muted mt-1">{{ d.deudas.countMeDeben }} deuda{{ d.deudas.countMeDeben !== 1 ? 's' : '' }} →</p>
        </button>
        <button
          class="rounded-2xl border border-theme-border bg-theme-card p-4 text-left active:scale-[0.98] transition-transform"
          @click="$emit('ir', 'planificador')"
        >
          <div class="flex items-center gap-1.5 mb-2">
            <span class="text-sm">📋</span>
            <span class="text-[0.62rem] uppercase tracking-wider font-bold text-theme-text-muted">Plan mensual</span>
          </div>
          <p class="text-lg font-extrabold tabular-nums" :class="d.plan.porcentajePagado > 70 ? 'text-emerald-400' : 'text-theme-accent'">
            {{ d.plan.porcentajePagado.toFixed(0) }}%
          </p>
          <p class="text-[0.68rem] text-theme-text-muted mt-1">{{ d.plan.countPagados }}/{{ d.plan.countTotal }} pagados →</p>
        </button>
      </div>

      <!-- Saldo neto del mes -->
      <button
        class="w-full rounded-2xl border border-theme-border bg-theme-card p-4 mb-4 text-left active:scale-[0.99] transition-transform"
        @click="$emit('ir', 'ingresos')"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <span class="text-[0.62rem] uppercase tracking-wider font-bold text-theme-text-muted">Saldo neto del mes</span>
            <div class="mt-1">
              <Preview3Money :value="d.ingresos.saldoNeto" signo tone="auto" class="text-lg font-extrabold" />
            </div>
          </div>
          <div class="text-right shrink-0">
            <p class="text-[0.62rem] text-theme-text-muted">Ingresos</p>
            <Preview3Money :value="d.ingresos.totalMes" class="text-sm font-semibold text-emerald-400" />
          </div>
        </div>
      </button>

      <!-- Módulos: todos navegan a su vista V3 -->
      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Tus módulos</p>
      <div class="rounded-2xl border border-theme-border bg-theme-card divide-y divide-theme-border/60 overflow-hidden">
        <button
          v-for="m in modulos"
          :key="m.vista"
          class="w-full flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px] text-left active:bg-theme-input/60 transition-colors"
          @click="$emit('ir', m.vista)"
        >
          <span class="flex items-center gap-2.5 min-w-0">
            <span class="text-base shrink-0">{{ m.icon }}</span>
            <span class="text-sm text-theme-text truncate">{{ m.label }}</span>
          </span>
          <span class="flex items-center gap-1.5 shrink-0">
            <Preview3Money v-if="m.value > 0" :value="m.value" entero :tone="m.tone" class="text-sm font-semibold" />
            <span v-else class="text-[0.72rem] font-medium" :class="m.ctaColor">{{ m.cta }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
defineEmits(['ir'])

const { apiFetch } = useApiFetch()

const loading = ref(true)
const d = ref({
  mes: 0, anio: 0,
  gastos: { totalMes: 0 },
  deudas: { totalMeDeben: 0, countMeDeben: 0 },
  plan: { presupuesto: 0, countTotal: 0, countPagados: 0, porcentajePagado: 0 },
  futuros: { totalProyectos: 0, totalPromedio: 0 },
  ahorros: { totalMes: 0 },
  ingresos: { totalMes: 0, saldoNeto: 0 },
})

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesLabel = computed(() => (d.value.mes ? MESES[d.value.mes - 1] : '...'))
const presupuesto = computed(() => Number(d.value.plan?.presupuesto) || 0)
const porcentaje = computed(() => (presupuesto.value > 0 ? (Number(d.value.gastos.totalMes) / presupuesto.value) * 100 : 0))
const saldo = computed(() => presupuesto.value - Number(d.value.gastos.totalMes))
const excedido = computed(() => saldo.value < 0)

// El titular baja de tamaño según la cantidad de dígitos: nunca desborda
// a 380px con texto grande.
const heroFontStyle = computed(() => {
  const len = String(Math.round(Number(d.value.gastos.totalMes) || 0)).length
  const max = len >= 7 ? 1.7 : len >= 6 ? 2.0 : 2.3
  return { fontSize: `clamp(1.5rem, ${max - 0.2 + 5}vw, ${max}rem)` }
})

const modulos = computed(() => [
  { icon: '🛍️', label: 'Gastos futuros', vista: 'futuros', value: Number(d.value.futuros?.totalPromedio) || 0, tone: 'violet', cta: 'Comenzar', ctaColor: 'text-violet-400' },
  { icon: '🐷', label: 'Ahorros del mes', vista: 'ahorros', value: Number(d.value.ahorros?.totalMes) || 0, tone: 'sky', cta: 'Crear meta', ctaColor: 'text-sky-400' },
  { icon: '💵', label: 'Ingresos del mes', vista: 'ingresos', value: Number(d.value.ingresos?.totalMes) || 0, tone: 'green', cta: 'Registrar', ctaColor: 'text-emerald-400' },
  { icon: '📅', label: 'Calendario', vista: 'calendario', value: 0, cta: 'Abrir', ctaColor: 'text-theme-accent' },
  { icon: '📊', label: 'Métricas', vista: 'metricas', value: 0, cta: 'Abrir', ctaColor: 'text-theme-accent' },
  { icon: '📄', label: 'Reportes', vista: 'reportes', value: 0, cta: 'Abrir', ctaColor: 'text-theme-accent' },
  { icon: '👨‍👩‍👧', label: 'Familia', vista: 'familia', value: 0, cta: 'Abrir', ctaColor: 'text-theme-accent' },
])

onMounted(async () => {
  try {
    const r = await apiFetch('/api/dashboard')
    d.value = { ...d.value, ...r }
  } catch {
    // En preview, fallar silencioso: dejamos los ceros.
  } finally {
    loading.value = false
  }
})
</script>
