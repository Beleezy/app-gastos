<template>
  <div class="px-4 pt-3 pb-28">
    <h1 class="text-2xl font-extrabold text-gradient-blue leading-tight mb-0.5">Planificador</h1>
    <p class="text-[0.78rem] text-theme-text-sec mb-4">Tu presupuesto y gastos del mes</p>

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-32 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-24 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Resumen del presupuesto -->
      <div class="rounded-2xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-4 mb-3">
        <p class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Presupuesto</p>
        <SharedMoney :value="presupuesto" class="text-2xl font-extrabold text-gradient-blue block mt-1" />
        <div class="h-1.5 w-full rounded-full bg-theme-input overflow-hidden mt-3">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="pctAsignado > 100 ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
            :style="{ width: Math.min(pctAsignado, 100) + '%' }"
          ></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-3">
          <div class="rounded-xl bg-theme-input p-3">
            <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Asignado</p>
            <SharedMoney :value="totalAsignado" class="text-base font-bold text-theme-text block mt-0.5" />
          </div>
          <div class="rounded-xl bg-theme-input p-3">
            <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Saldo proyectado</p>
            <SharedMoney :value="saldo" tone="auto" class="text-base font-bold block mt-0.5" />
          </div>
        </div>
        <div class="flex items-center gap-3 mt-3 text-[0.68rem]">
          <span class="text-emerald-400 font-medium">● {{ countPagados }} pagados</span>
          <span class="text-amber-400 font-medium">● {{ countPendientes }} pendientes</span>
        </div>
      </div>

      <!-- Gastos planificados agrupados por categoría -->
      <div v-if="grupos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin gastos planificados este mes</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="g in grupos" :key="g.nombre" class="rounded-2xl border border-theme-border bg-theme-card overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 bg-theme-input/40">
            <span class="flex items-center gap-2 min-w-0">
              <span class="text-base shrink-0">{{ g.icono || '📦' }}</span>
              <span class="text-sm font-semibold text-theme-text truncate">{{ g.nombre }}</span>
            </span>
            <SharedMoney :value="g.total" class="text-sm font-bold text-theme-text shrink-0" />
          </div>
          <div class="divide-y divide-theme-border/50">
            <div v-for="item in g.items" :key="item.id" class="flex items-center justify-between gap-3 px-4 py-2.5">
              <div class="min-w-0 flex-1">
                <p class="text-sm text-theme-text truncate">{{ item.concepto }}</p>
                <span
                  class="inline-block mt-0.5 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                  :class="item.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'"
                >{{ item.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}</span>
              </div>
              <SharedMoney :value="item.montoEstimado" class="text-sm font-semibold text-theme-text shrink-0" />
            </div>
          </div>
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
const plan = ref(null)
const gastos = ref([])

const mesLabel = computed(() => `${MESES[mes.value - 1]} ${anio.value}`)
const presupuesto = computed(() => Number(plan.value?.montoPresupuesto) || 0)
const totalAsignado = computed(() => gastos.value.reduce((s, g) => s + (Number(g.montoEstimado) || 0), 0))
const saldo = computed(() => presupuesto.value - totalAsignado.value)
const pctAsignado = computed(() => (presupuesto.value > 0 ? (totalAsignado.value / presupuesto.value) * 100 : 0))
const countPagados = computed(() => gastos.value.filter(g => g.estado === 'pagado').length)
const countPendientes = computed(() => gastos.value.length - countPagados.value)

const grupos = computed(() => {
  const map = new Map()
  for (const g of gastos.value) {
    const k = g.categoriaNombre || 'Sin categoría'
    if (!map.has(k)) map.set(k, { nombre: k, icono: g.categoriaIcono, total: 0, items: [] })
    const grp = map.get(k)
    grp.items.push(g)
    grp.total += Number(g.montoEstimado) || 0
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
})

function cambiar(delta) {
  let m = mes.value + delta
  let a = anio.value
  if (m < 1) { m = 12; a-- }
  if (m > 12) { m = 1; a++ }
  mes.value = m; anio.value = a
  cargar()
}

async function cargar() {
  loading.value = true
  try {
    const r = await apiFetch('/api/planificador', { query: { mes: mes.value, anio: anio.value } })
    plan.value = r.plan || null
    gastos.value = Array.isArray(r.gastos) ? r.gastos : []
  } catch {
    plan.value = null; gastos.value = []
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>
