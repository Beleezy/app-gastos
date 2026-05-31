<template>
  <div class="px-4 pt-3 pb-28">
    <h1 class="text-2xl font-extrabold text-gradient-blue leading-tight mb-0.5">Ahorros</h1>
    <p class="text-[0.78rem] text-theme-text-sec mb-4">Tus metas y depósitos</p>

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-32 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-20 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Meta + acumulado -->
      <div class="rounded-2xl border border-theme-border bg-gradient-to-br from-sky-500/5 to-theme-card p-4 mb-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Este mes</p>
            <SharedMoney :value="totalMes" tone="sky" class="text-2xl font-extrabold block mt-1" />
          </div>
          <div class="text-right">
            <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Acumulado</p>
            <SharedMoney :value="totalGlobal" class="text-base font-bold text-theme-text block mt-1" />
          </div>
        </div>
        <template v-if="metaMensual > 0">
          <div class="h-1.5 w-full rounded-full bg-theme-input overflow-hidden mt-3">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" :style="{ width: Math.min(progresoMensual, 100) + '%' }"></div>
          </div>
          <p class="text-[0.68rem] text-theme-text-muted mt-1.5">
            {{ progresoMensual.toFixed(0) }}% de la meta (<SharedMoney :value="metaMensual" />)
          </p>
        </template>
        <p v-else class="text-[0.68rem] text-theme-text-muted mt-2">Sin meta mensual definida</p>
      </div>

      <!-- Por medio -->
      <div v-if="porMedio.length" class="mb-3">
        <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Por medio</p>
        <div class="rounded-2xl border border-theme-border bg-theme-card divide-y divide-theme-border/60">
          <div v-for="m in porMedio" :key="m.medioAhorroId || m.medioNombre" class="flex items-center justify-between px-4 py-3">
            <span class="flex items-center gap-2.5 min-w-0">
              <span class="text-base shrink-0">{{ m.medioIcono || '🏦' }}</span>
              <span class="text-sm text-theme-text truncate">{{ m.medioNombre || 'Sin medio' }}</span>
            </span>
            <SharedMoney :value="m.total" tone="sky" class="text-sm font-semibold shrink-0" />
          </div>
        </div>
      </div>

      <!-- Movimientos -->
      <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Movimientos</p>
      <div v-if="ahorros.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin ahorros este mes</p>
      </div>
      <div v-else class="space-y-2">
        <div v-for="a in ahorros" :key="a.id" class="rounded-2xl border border-theme-border bg-theme-card p-3.5 flex items-center gap-3">
          <span class="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0 text-base">🐷</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-theme-text font-medium line-clamp-2 break-words leading-snug">{{ a.concepto || 'Aporte' }}</p>
            <p class="text-[0.62rem] text-theme-text-muted mt-0.5">{{ fechaCorta(a.fecha) }}</p>
          </div>
          <SharedMoney :value="a.monto" signo tone="sky" class="text-base font-bold shrink-0" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const hoy = new Date()
const mes = ref(hoy.getUTCMonth() + 1)
const anio = ref(hoy.getUTCFullYear())
const loading = ref(true)
const ahorros = ref([])
const totalMes = ref(0)
const totalGlobal = ref(0)
const porMedio = ref([])
const metaMensual = ref(0)
const progresoMensual = ref(0)

const mesLabel = computed(() => `${MESES[mes.value - 1]} ${anio.value}`)
function fechaCorta(f) {
  if (!f) return ''
  const [, m, d] = f.split('-').map(Number)
  return `${d}/${String(m).padStart(2, '0')}`
}

function cambiar(delta) {
  let m = mes.value + delta, a = anio.value
  if (m < 1) { m = 12; a-- }
  if (m > 12) { m = 1; a++ }
  mes.value = m; anio.value = a
  cargar()
}

async function cargar() {
  loading.value = true
  try {
    const r = await apiFetch('/api/ahorros', { query: { mes: mes.value, anio: anio.value } })
    ahorros.value = Array.isArray(r?.ahorros) ? r.ahorros : []
    totalMes.value = Number(r?.totalMes) || 0
    totalGlobal.value = Number(r?.totalGlobal) || 0
    porMedio.value = Array.isArray(r?.porMedio) ? r.porMedio : []
    metaMensual.value = Number(r?.metaMensual) || 0
    progresoMensual.value = Number(r?.progresoMensual) || 0
  } catch {
    ahorros.value = []
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>
