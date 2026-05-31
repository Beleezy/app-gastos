<template>
  <div class="px-4 pt-3 pb-28">
    <!-- Saludo -->
    <div class="flex items-center gap-3 mb-4">
      <div class="w-11 h-11 rounded-2xl bg-theme-accent-bg flex items-center justify-center">
        <span class="text-xl">👋</span>
      </div>
      <div class="min-w-0">
        <h1 class="text-xl font-extrabold text-gradient-blue leading-tight">Hola de nuevo</h1>
        <p class="text-[11px] text-theme-text-sec">Tu resumen de {{ mesLabel }}</p>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div class="h-32 rounded-3xl bg-theme-card shimmer"></div>
      <div class="grid grid-cols-2 gap-2.5">
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
        <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
      </div>
    </div>

    <template v-else>
      <!-- HERO: gasto del mes (R3 fluido) -->
      <div class="relative overflow-hidden rounded-3xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-5 mb-3">
        <div
          class="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none"
          :class="excedido ? 'bg-red-500/10' : porcentaje > 70 ? 'bg-amber-500/10' : 'bg-theme-accent-bg'"
        ></div>
        <div class="relative">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[0.62rem] uppercase tracking-wider font-bold text-theme-text-muted">Gasto del mes</span>
            <span class="text-[10px] text-theme-accent font-medium">Ver detalle →</span>
          </div>
          <div class="flex items-end justify-between gap-3">
            <SharedMoney
              :value="d.gastos.totalMes"
              class="font-extrabold leading-none text-gradient-blue"
              :style="heroFontStyle"
            />
            <span v-if="presupuesto > 0" class="text-xs text-theme-text-muted shrink-0 pb-1">
              de <SharedMoney :value="presupuesto" />
            </span>
          </div>

          <div v-if="presupuesto > 0" class="mt-3">
            <div class="h-1.5 w-full rounded-full bg-theme-input overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="excedido ? 'bg-gradient-to-r from-red-500 to-rose-400' : porcentaje > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
                :style="{ width: Math.min(porcentaje, 100) + '%' }"
              ></div>
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <span class="text-[0.68rem] font-semibold" :class="excedido ? 'text-red-400' : 'text-emerald-400'">
                {{ excedido ? 'Excedido' : 'Disponible' }}:
                <SharedMoney :value="Math.abs(saldo)" :tone="excedido ? 'red' : 'green'" />
              </span>
              <span class="text-[0.68rem] text-theme-text-sec font-medium tabular-nums">{{ porcentaje.toFixed(0) }}%</span>
            </div>
          </div>
          <p v-else class="mt-2 text-[0.68rem] text-theme-text-muted">Sin presupuesto configurado este mes</p>
        </div>
      </div>

      <!-- 2 col: Me deben / Plan -->
      <div class="grid grid-cols-2 gap-2.5 mb-3">
        <div class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-center gap-1.5 mb-2">
            <span class="text-sm">💳</span>
            <span class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Me deben</span>
          </div>
          <SharedMoney :value="d.deudas.totalMeDeben" compact tone="amber" class="text-xl font-extrabold" />
          <p class="text-[0.66rem] text-theme-text-muted mt-1">{{ d.deudas.countMeDeben }} deuda{{ d.deudas.countMeDeben !== 1 ? 's' : '' }}</p>
        </div>
        <div class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-center gap-1.5 mb-2">
            <span class="text-sm">📋</span>
            <span class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Plan mensual</span>
          </div>
          <p class="text-xl font-extrabold tabular-nums" :class="d.plan.porcentajePagado > 70 ? 'text-emerald-400' : 'text-theme-accent'">
            {{ d.plan.porcentajePagado.toFixed(0) }}%
          </p>
          <p class="text-[0.66rem] text-theme-text-muted mt-1">{{ d.plan.countPagados }}/{{ d.plan.countTotal }} pagados</p>
        </div>
      </div>

      <!-- Saldo neto del mes (ingresos - gastos) -->
      <div class="rounded-2xl border border-theme-border bg-theme-card p-4 mb-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Saldo neto del mes</span>
            <div class="mt-1">
              <SharedMoney :value="d.ingresos.saldoNeto" signo tone="auto" class="text-lg font-extrabold" />
            </div>
          </div>
          <div class="text-right">
            <p class="text-[0.6rem] text-theme-text-muted">Ingresos</p>
            <SharedMoney :value="d.ingresos.totalMes" class="text-sm font-semibold text-emerald-400" />
          </div>
        </div>
      </div>

      <!-- Módulos: con datos → cifra; sin datos → CTA compacto (R4) -->
      <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Tus módulos</p>
      <div class="rounded-2xl border border-theme-border bg-theme-card divide-y divide-theme-border/60">
        <div v-for="m in modulos" :key="m.label" class="flex items-center justify-between px-4 py-3">
          <span class="flex items-center gap-2.5 min-w-0">
            <span class="text-base shrink-0">{{ m.icon }}</span>
            <span class="text-sm text-theme-text truncate">{{ m.label }}</span>
          </span>
          <SharedMoney v-if="m.value > 0" :value="m.value" compact :tone="m.tone" class="text-sm font-semibold shrink-0" />
          <span v-else class="text-[0.72rem] font-medium shrink-0" :class="m.ctaColor">{{ m.cta }} →</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
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
const mesLabel = computed(() => (d.value.mes ? MESES[d.value.mes - 1] : ''))
const presupuesto = computed(() => Number(d.value.plan?.presupuesto) || 0)
const porcentaje = computed(() => (presupuesto.value > 0 ? (Number(d.value.gastos.totalMes) / presupuesto.value) * 100 : 0))
const saldo = computed(() => presupuesto.value - Number(d.value.gastos.totalMes))
const excedido = computed(() => saldo.value < 0)

// R3: el tamaño del titular baja según la cantidad de dígitos para que
// nunca desborde a 380px con texto grande.
const heroFontStyle = computed(() => {
  const len = String(Math.round(Number(d.value.gastos.totalMes) || 0)).length
  const max = len >= 7 ? 1.7 : len >= 6 ? 2.0 : 2.35
  return { fontSize: `clamp(1.5rem, ${max - 0.2 + 5}vw, ${max}rem)` }
})

const modulos = computed(() => [
  { icon: '🛍️', label: 'Gastos futuros', value: Number(d.value.futuros?.totalPromedio) || 0, tone: 'sky', cta: 'Comenzar', ctaColor: 'text-violet-400' },
  { icon: '🐷', label: 'Ahorros del mes', value: Number(d.value.ahorros?.totalMes) || 0, tone: 'sky', cta: 'Crear meta', ctaColor: 'text-sky-400' },
  { icon: '💵', label: 'Ingresos del mes', value: Number(d.value.ingresos?.totalMes) || 0, tone: 'green', cta: 'Registrar', ctaColor: 'text-emerald-400' },
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
