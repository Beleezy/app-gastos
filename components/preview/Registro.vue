<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="🎙️" title="Registro" subtitle="Tus gastos del día a día" />

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-36 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Resumen mes -->
      <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-4 mb-3">
        <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Gastado este mes</p>
        <PreviewMoney :value="totalMes" :tone="excedido ? 'red' : 'none'" class="text-[1.7rem] font-extrabold block mt-1" :class="!excedido ? 'text-gradient-blue' : ''" />
        <div v-if="presupuesto > 0">
          <div class="h-2 w-full rounded-full bg-theme-input overflow-hidden mt-3">
            <div class="h-full rounded-full" :class="excedido ? 'bg-red-500' : 'bg-emerald-500'" :style="{ width: Math.min(pct, 100) + '%' }"></div>
          </div>
          <div class="flex items-center justify-between gap-2 mt-1.5">
            <p class="text-[0.72rem] min-w-0" :class="excedido ? 'text-red-400' : 'text-theme-text-muted'">
              {{ pct.toFixed(0) }}% de <PreviewMoney :value="presupuesto" entero />
            </p>
            <p class="text-[0.72rem] text-theme-text-sec shrink-0">{{ gastos.length }} gastos</p>
          </div>
        </div>
        <p v-else class="text-[0.72rem] text-theme-text-muted mt-2">{{ gastos.length }} gastos registrados</p>
      </div>

      <!-- Historial por día -->
      <div v-if="dias.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin gastos este mes</p>
      </div>
      <div v-else class="space-y-3">
        <section v-for="d in dias" :key="d.fecha" class="rounded-2xl border border-theme-border bg-theme-card overflow-hidden">
          <div class="flex items-center justify-between gap-2 px-4 py-2.5 bg-theme-input/40">
            <span class="flex items-center gap-2.5 min-w-0">
              <span class="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-theme-card shrink-0">
                <span class="text-[0.56rem] uppercase font-bold text-theme-text-muted leading-none">{{ d.diaSemana }}</span>
                <span class="text-sm font-bold text-theme-text leading-tight">{{ d.diaNum }}</span>
              </span>
              <span class="text-[0.72rem] text-theme-text-muted truncate">{{ d.items.length }} gasto{{ d.items.length !== 1 ? 's' : '' }}</span>
            </span>
            <PreviewMoney :value="d.total" class="text-sm font-bold text-theme-text shrink-0" />
          </div>
          <div class="divide-y divide-theme-border/50">
            <!-- Fila apilada: concepto a todo lo ancho, monto en la fila de meta. -->
            <div v-for="g in d.items" :key="g.id" class="flex items-start gap-3 px-4 py-3">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" :style="{ backgroundColor: (g.categoriaColor || '#6b7280') + '22' }">
                <span class="text-sm">{{ g.categoriaIcono || '💸' }}</span>
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-theme-text leading-snug line-clamp-2 break-words">{{ g.concepto }}</p>
                <div class="flex items-center justify-between gap-2 mt-1">
                  <p class="text-[0.66rem] text-theme-text-muted truncate">{{ g.categoriaNombre }} · {{ (g.hora || '').slice(0, 5) }}</p>
                  <PreviewMoney :value="g.monto" class="text-sm font-semibold text-theme-text shrink-0" />
                </div>
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
const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

const hoy = new Date()
const mes = ref(hoy.getUTCMonth() + 1)
const anio = ref(hoy.getUTCFullYear())
const loading = ref(true)
const gastos = ref([])
const totalMes = ref(0)
const presupuesto = ref(0)

const mesLabel = computed(() => `${MESES[mes.value - 1]} ${anio.value}`)
const pct = computed(() => (presupuesto.value > 0 ? (totalMes.value / presupuesto.value) * 100 : 0))
const excedido = computed(() => presupuesto.value > 0 && totalMes.value > presupuesto.value)

const dias = computed(() => {
  const map = new Map()
  for (const g of gastos.value) {
    if (!map.has(g.fecha)) map.set(g.fecha, [])
    map.get(g.fecha).push(g)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([fecha, items]) => {
      const [y, m, dd] = fecha.split('-').map(Number)
      const dt = new Date(Date.UTC(y, m - 1, dd))
      return {
        fecha,
        diaNum: dd,
        diaSemana: DIAS[dt.getUTCDay()],
        items,
        total: items.reduce((s, g) => s + (Number(g.monto) || 0), 0),
      }
    })
})

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
    const [lista, resumen, plan] = await Promise.all([
      apiFetch('/api/gastos', { query: { mes: mes.value, anio: anio.value } }),
      apiFetch('/api/gastos/resumen', { query: { mes: mes.value, anio: anio.value } }),
      apiFetch('/api/planificador', { query: { mes: mes.value, anio: anio.value } }).catch(() => null),
    ])
    gastos.value = Array.isArray(lista) ? lista : []
    totalMes.value = Number(resumen?.totalMes) || 0
    presupuesto.value = Number(plan?.plan?.montoPresupuesto) || 0
  } catch {
    gastos.value = []; totalMes.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>
