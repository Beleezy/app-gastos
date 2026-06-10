<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="📋" title="Planificador" subtitle="Tu presupuesto y gastos del mes" />

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-36 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Resumen del presupuesto -->
      <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-4 mb-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Presupuesto</p>
          <span class="text-[0.68rem] text-theme-text-sec tabular-nums shrink-0">{{ pctAsignado.toFixed(0) }}% asignado</span>
        </div>
        <PreviewMoney :value="presupuesto" class="text-[1.7rem] font-extrabold text-gradient-blue block mt-1" />
        <div class="h-2 w-full rounded-full bg-theme-input overflow-hidden mt-3">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="pctAsignado > 100 ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
            :style="{ width: Math.min(pctAsignado, 100) + '%' }"
          ></div>
        </div>
        <div class="grid grid-cols-2 gap-2.5 mt-3">
          <div class="rounded-xl bg-theme-input p-3 min-w-0">
            <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Asignado</p>
            <PreviewMoney :value="totalAsignado" entero class="text-base font-bold text-theme-text block mt-0.5" />
          </div>
          <div class="rounded-xl bg-theme-input p-3 min-w-0">
            <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Saldo proyectado</p>
            <PreviewMoney :value="saldo" entero tone="auto" class="text-base font-bold block mt-0.5" />
          </div>
        </div>
        <div class="flex items-center gap-3 mt-3 text-[0.72rem]">
          <span class="text-emerald-400 font-medium">● {{ countPagados }} pagados</span>
          <span class="text-amber-400 font-medium">● {{ countPendientes }} pendientes</span>
        </div>
      </div>

      <!-- Gastos planificados agrupados por categoría -->
      <div v-if="grupos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin gastos planificados este mes</p>
      </div>
      <div v-else class="space-y-3">
        <section v-for="g in grupos" :key="g.nombre" class="rounded-2xl border border-theme-border bg-theme-card overflow-hidden">
          <div class="flex items-center justify-between gap-2 px-4 py-2.5 bg-theme-input/40">
            <span class="flex items-center gap-2 min-w-0">
              <span class="text-base shrink-0">{{ g.icono || '📦' }}</span>
              <span class="text-sm font-semibold text-theme-text truncate">{{ g.nombre }}</span>
            </span>
            <PreviewMoney :value="g.total" entero class="text-sm font-bold text-theme-text shrink-0" />
          </div>
          <div class="divide-y divide-theme-border/50">
            <!-- Fila apilada: el concepto usa TODO el ancho (2 líneas máx.)
                 y el monto va en su propia fila → nada se aplasta con texto grande. -->
            <div v-for="item in g.items" :key="item.id" class="px-4 py-3">
              <p class="text-sm text-theme-text leading-snug line-clamp-2 break-words">{{ item.concepto }}</p>
              <div class="flex items-center justify-between gap-2 mt-1.5">
                <span class="flex items-center gap-1.5 min-w-0">
                  <span
                    class="text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    :class="item.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'"
                  >{{ item.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}</span>
                  <span class="text-[0.66rem] text-theme-text-muted truncate">{{ fechaCorta(item.fechaProbablePago) }}</span>
                </span>
                <PreviewMoney :value="item.montoEstimado" class="text-sm font-semibold text-theme-text shrink-0" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

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

function fechaCorta(f) {
  if (!f) return ''
  const [, m, d] = f.split('-').map(Number)
  return `${d} ${MES_CORTO[m - 1]}`
}

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
