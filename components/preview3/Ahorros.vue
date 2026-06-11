<template>
  <div class="px-4 pt-3 pb-32">
    <Preview3PageHeader icon="🐷" title="Ahorros" subtitle="Tus metas y depósitos" accent="sky" />

    <Preview3MonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-36 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Meta + acumulado -->
      <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-sky-500/5 to-theme-card p-4 mb-3">
        <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Ahorrado este mes</p>
        <Preview3Money :value="totalMes" tone="sky" class="text-[1.7rem] font-extrabold block mt-1" />
        <template v-if="metaMensual > 0">
          <div class="h-2 w-full rounded-full bg-theme-input overflow-hidden mt-3">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" :style="{ width: Math.min(progresoMensual, 100) + '%' }"></div>
          </div>
          <div class="flex items-center justify-between gap-2 mt-1.5 text-[0.72rem] text-theme-text-muted">
            <span class="min-w-0 truncate">Meta: <Preview3Money :value="metaMensual" entero /></span>
            <span class="shrink-0 tabular-nums">{{ progresoMensual.toFixed(0) }}%</span>
          </div>
        </template>
        <p v-else class="text-[0.72rem] text-theme-text-muted mt-2">Sin meta mensual definida</p>
        <div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-theme-border/50">
          <span class="text-[0.66rem] uppercase tracking-wide text-theme-text-muted">Total acumulado</span>
          <Preview3Money :value="totalGlobal" class="text-base font-bold text-theme-text shrink-0" />
        </div>
      </div>

      <!-- Por medio: fila apilada para nombres largos de banco/cuenta -->
      <div v-if="porMedio.length" class="mb-3">
        <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Por medio</p>
        <div class="rounded-2xl border border-theme-border bg-theme-card divide-y divide-theme-border/60">
          <div v-for="m in porMedio" :key="m.medioAhorroId || m.medioNombre" class="flex items-start gap-3 px-4 py-3">
            <span class="text-base shrink-0 mt-0.5">{{ m.medioIcono || '🏦' }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-theme-text leading-snug line-clamp-2 break-words">{{ m.medioNombre || 'Sin medio' }}</p>
              <div class="flex items-center justify-end mt-1">
                <Preview3Money :value="m.total" tone="sky" class="text-sm font-semibold shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Movimientos -->
      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Movimientos</p>
      <div v-if="ahorros.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin ahorros este mes</p>
      </div>
      <div v-else class="space-y-2">
        <article v-for="a in ahorros" :key="a.id" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-start gap-3">
            <span class="w-10 h-10 rounded-2xl bg-sky-500/15 flex items-center justify-center shrink-0 text-base">🐷</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-theme-text font-medium leading-snug line-clamp-2 break-words">{{ a.concepto || 'Aporte' }}</p>
              <div class="flex items-center justify-between gap-2 mt-1">
                <p class="text-[0.66rem] text-theme-text-muted">{{ fechaCorta(a.fecha) }}</p>
                <Preview3Money :value="a.monto" signo tone="sky" class="text-base font-bold shrink-0" />
              </div>
            </div>
          </div>
        </article>
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
