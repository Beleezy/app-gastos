<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="📅" title="Calendario" subtitle="Cobros, pagos y vencimientos" />

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="h-64 rounded-2xl bg-theme-card shimmer"></div>

    <template v-else>
      <!-- Grilla -->
      <div class="rounded-2xl border border-theme-border bg-theme-card p-3 mb-3">
        <div class="grid grid-cols-7 gap-1 mb-1">
          <div v-for="d in ['L','M','X','J','V','S','D']" :key="d" class="text-center text-[0.62rem] font-bold text-theme-text-muted">{{ d }}</div>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="(cell, i) in celdas"
            :key="i"
            class="aspect-square rounded-lg flex flex-col items-center justify-center relative"
            :class="cell.dia ? (cell.esHoy ? 'bg-theme-accent-bg ring-1 ring-theme-accent' : 'bg-theme-input/50') : ''"
          >
            <span v-if="cell.dia" class="text-[0.72rem]" :class="cell.esHoy ? 'text-theme-accent font-bold' : 'text-theme-text-sec'">{{ cell.dia }}</span>
            <div v-if="cell.eventos?.length" class="flex gap-0.5 mt-0.5">
              <span v-for="(ev, j) in cell.eventos.slice(0, 3)" :key="j" class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: ev.color }"></span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-2.5 px-1 text-[0.64rem] text-theme-text-muted">
          <span><span class="text-violet-400">●</span> Planificado</span>
          <span><span class="text-emerald-400">●</span> Cobro</span>
          <span><span class="text-rose-400">●</span> Pago</span>
        </div>
      </div>

      <!-- Lista de eventos -->
      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Eventos del mes ({{ eventos.length }})</p>
      <div v-if="eventos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin eventos este mes</p>
      </div>
      <div v-else class="space-y-2">
        <article v-for="(ev, i) in eventos" :key="i" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-start gap-3">
            <span class="flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0" :style="{ backgroundColor: ev.color + '22' }">
              <span class="text-[0.56rem] uppercase font-bold leading-none" :style="{ color: ev.color }">{{ mesCortoLabel }}</span>
              <span class="text-sm font-bold text-theme-text leading-tight">{{ ev.dia }}</span>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-theme-text font-medium leading-snug line-clamp-2 break-words">{{ ev.titulo }}</p>
              <div class="flex items-center justify-between gap-2 mt-1">
                <p class="text-[0.66rem] text-theme-text-muted">{{ ev.tipoLabel }}</p>
                <PreviewMoney :value="ev.monto" :tone="ev.signo > 0 ? 'green' : 'red'" :signo="ev.signo > 0" class="text-sm font-bold shrink-0" />
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
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const hoy = new Date()
const mes = ref(hoy.getUTCMonth() + 1)
const anio = ref(hoy.getUTCFullYear())
const loading = ref(true)
const eventos = ref([])

const mesLabel = computed(() => `${MESES[mes.value - 1]} ${anio.value}`)
const mesCortoLabel = computed(() => MESES_CORTO[mes.value - 1])

const celdas = computed(() => {
  const primerDia = new Date(Date.UTC(anio.value, mes.value - 1, 1))
  const offset = (primerDia.getUTCDay() + 6) % 7 // lunes = 0
  const diasMes = new Date(Date.UTC(anio.value, mes.value, 0)).getUTCDate()
  const hoyStr = `${hoy.getUTCFullYear()}-${hoy.getUTCMonth() + 1}-${hoy.getUTCDate()}`
  const porDia = new Map()
  for (const ev of eventos.value) {
    if (!porDia.has(ev.dia)) porDia.set(ev.dia, [])
    porDia.get(ev.dia).push(ev)
  }
  const arr = []
  for (let i = 0; i < offset; i++) arr.push({ dia: null })
  for (let d = 1; d <= diasMes; d++) {
    arr.push({
      dia: d,
      esHoy: `${anio.value}-${mes.value}-${d}` === hoyStr,
      eventos: porDia.get(d) || [],
    })
  }
  return arr
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
    const [plan, deudas] = await Promise.all([
      apiFetch('/api/planificador', { query: { mes: mes.value, anio: anio.value } }).catch(() => null),
      apiFetch('/api/deudas', { query: {} }).catch(() => []),
    ])
    const evs = []
    for (const g of (plan?.gastos || [])) {
      if (!g.fechaProbablePago) continue
      const [y, m, d] = g.fechaProbablePago.split('-').map(Number)
      if (y === anio.value && m === mes.value) {
        evs.push({ dia: d, titulo: g.concepto, tipoLabel: 'Planificado', color: '#a78bfa', icono: g.categoriaIcono || '📋', monto: Number(g.montoEstimado) || 0, signo: -1 })
      }
    }
    for (const de of (Array.isArray(deudas) ? deudas : [])) {
      if (!de.fechaPago) continue
      const [y, m, d] = de.fechaPago.split('-').map(Number)
      if (y === anio.value && m === mes.value) {
        const meDeben = de.tipoDeuda === 'me_deben'
        evs.push({ dia: d, titulo: de.concepto, tipoLabel: meDeben ? 'Cobro' : 'Pago', color: meDeben ? '#34d399' : '#fb7185', icono: '💳', monto: Number(de.montoPendiente) || 0, signo: meDeben ? 1 : -1 })
      }
    }
    evs.sort((a, b) => a.dia - b.dia)
    eventos.value = evs
  } catch {
    eventos.value = []
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>
