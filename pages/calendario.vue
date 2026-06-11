<template>
  <div class="min-h-screen flex flex-col">
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-500/15 rounded-full blur-3xl"></div>
      <div class="relative flex items-center gap-3">
        <button
          class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          @click="toggleDrawer"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-gradient-blue">Calendario financiero</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Cobros, pagos y vencimientos</p>
        </div>
      </div>
    </div>

    <!-- Filtros de fuentes -->
    <div class="px-5 lg:px-0 mb-3">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="f in filtros"
          :key="f.valor"
          @click="toggleFiltro(f.valor)"
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
          :class="filtrosActivos.has(f.valor) ? `border-transparent text-white` : 'border-theme-border text-theme-text-muted'"
          :style="filtrosActivos.has(f.valor) ? { backgroundColor: f.color } : {}"
        >
          {{ f.icono }} {{ f.etiqueta }}
        </button>
      </div>
    </div>

    <!-- Navegador de mes -->
    <div class="px-5 lg:px-0 mb-3 flex items-center justify-between">
      <button
        class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md"
        @click="cambiarMes(-1)"
        aria-label="Mes anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <p class="text-sm font-bold text-theme-text">{{ etiquetaMes }}</p>
      <button
        class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md"
        @click="cambiarMes(1)"
        aria-label="Mes siguiente"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>

    <!-- Grilla calendario -->
    <div class="px-3 lg:px-0 mb-4">
      <div class="grid grid-cols-7 gap-1 mb-1 px-1">
        <div v-for="d in ['L','M','X','J','V','S','D']" :key="d" class="text-center text-[10px] font-semibold text-theme-text-muted">{{ d }}</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="(cell, i) in celdas"
          :key="i"
          @click="cell.dia ? abrirDia(cell.fecha) : null"
          :disabled="!cell.dia"
          class="aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] relative transition-colors"
          :class="[
            cell.dia ? 'bg-theme-card border border-theme-border active:bg-theme-border-md' : '',
            cell.esHoy ? 'ring-2 ring-violet-400' : '',
          ]"
        >
          <span v-if="cell.dia" :class="cell.esHoy ? 'text-violet-300 font-bold' : 'text-theme-text-sec'">{{ cell.dia }}</span>
          <div v-if="cell.eventos?.length" class="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            <span
              v-for="(ev, j) in cell.eventos.slice(0, 3)"
              :key="j"
              class="w-1.5 h-1.5 rounded-full"
              :style="{ backgroundColor: ev.color }"
            ></span>
            <span v-if="cell.eventos.length > 3" class="text-[8px] text-theme-text-muted ml-0.5">+{{ cell.eventos.length - 3 }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Lista del mes -->
    <div class="px-5 lg:px-0 mb-4">
      <p class="text-[10px] uppercase tracking-wider text-theme-text-muted mb-2 px-1">Eventos del mes ({{ eventosDelMes.length }})</p>
      <div v-if="cargando" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-14 w-full rounded-xl bg-theme-border-md shimmer"></div>
      </div>
      <ul v-else-if="eventosDelMes.length" class="space-y-2">
        <li
          v-for="ev in eventosDelMes"
          :key="`${ev.tipo}-${ev.id}-${ev.fecha}`"
          class="bg-theme-card rounded-xl border border-theme-border p-3 flex items-center gap-3"
        >
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
            :style="{ backgroundColor: ev.color + '20' }"
          >{{ ev.icono }}</div>
          <div class="flex-1 min-w-0">
            <!-- 2 líneas: conceptos largos planificados se truncaban con texto grande -->
            <p class="text-xs font-semibold text-theme-text line-clamp-2 break-words leading-snug">{{ ev.titulo }}</p>
            <p class="text-[10px] text-theme-text-muted">{{ etiquetaTipo(ev.tipo) }} · {{ fechaCorta(ev.fecha) }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs font-bold" :class="ev.signo > 0 ? 'text-emerald-400' : 'text-rose-400'">
              {{ ev.signo > 0 ? '+' : '-' }}{{ currencySymbol }}&nbsp;{{ formatMonto(Math.abs(ev.monto)) }}
            </p>
          </div>
        </li>
      </ul>
      <div v-else class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center text-xs text-theme-text-muted">
        Sin eventos este mes con los filtros actuales.
      </div>
    </div>

    <!-- Modal día -->
    <div v-if="diaSel" class="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60" @click.self="diaSel = null">
      <div class="w-full max-w-md bg-theme-card rounded-t-3xl lg:rounded-3xl border border-theme-border max-h-[80vh] overflow-y-auto overscroll-contain">
        <div class="sticky top-0 bg-theme-card border-b border-theme-border px-4 py-3 flex items-center justify-between z-10">
          <p class="text-sm font-bold text-theme-text">{{ fechaCorta(diaSel) }}</p>
          <button class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md" @click="diaSel = null" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <ul v-if="eventosDia.length" class="divide-y divide-theme-border/40">
          <li
            v-for="ev in eventosDia"
            :key="`d-${ev.tipo}-${ev.id}`"
            class="px-4 py-3 flex items-center gap-3"
          >
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" :style="{ backgroundColor: ev.color + '20' }">{{ ev.icono }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-theme-text truncate">{{ ev.titulo }}</p>
              <p class="text-[10px] text-theme-text-muted">{{ etiquetaTipo(ev.tipo) }}</p>
            </div>
            <p class="text-xs font-bold" :class="ev.signo > 0 ? 'text-emerald-400' : 'text-rose-400'">
              {{ ev.signo > 0 ? '+' : '-' }}{{ currencySymbol }}&nbsp;{{ formatMonto(Math.abs(ev.monto)) }}
            </p>
          </li>
        </ul>
        <p v-else class="px-4 py-6 text-center text-xs text-theme-text-muted">Sin eventos este día.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MESES } from '~/utils/constants'

const { currencySymbol, formatMonto } = useCurrency()
const { toggle: toggleDrawer } = useMobileDrawer()
const { apiFetch } = useApiFetch()

const filtros = [
  { valor: 'planificado', etiqueta: 'Planificados', icono: '📋', color: '#8b5cf6' },
  { valor: 'deuda', etiqueta: 'Deudas', icono: '💳', color: '#f59e0b' },
]
const filtrosActivos = ref(new Set(filtros.map(f => f.valor)))

function toggleFiltro(v) {
  const n = new Set(filtrosActivos.value)
  if (n.has(v)) n.delete(v)
  else n.add(v)
  filtrosActivos.value = n
}

const hoy = new Date()
const mesVer = ref(hoy.getMonth() + 1)
const anioVer = ref(hoy.getFullYear())

const etiquetaMes = computed(() => `${MESES[mesVer.value - 1]} ${anioVer.value}`)

function cambiarMes(delta) {
  let m = mesVer.value + delta
  let a = anioVer.value
  if (m < 1) { m = 12; a-- }
  if (m > 12) { m = 1; a++ }
  mesVer.value = m
  anioVer.value = a
  cargar()
}

// Eventos del backend
const planificados = ref([])
const deudasConFecha = ref([])
const cargando = ref(true)

async function cargar() {
  cargando.value = true
  try {
    const [planRes, deudasRes] = await Promise.allSettled([
      apiFetch('/api/planificador', { query: { mes: mesVer.value, anio: anioVer.value } }),
      apiFetch('/api/deudas', { query: {} }),
    ])
    planificados.value = planRes.status === 'fulfilled' ? (planRes.value?.gastos || []) : []
    deudasConFecha.value = deudasRes.status === 'fulfilled' ? (Array.isArray(deudasRes.value) ? deudasRes.value : []) : []
  } catch (e) {
    console.warn('[calendario] error cargando:', e)
  } finally {
    cargando.value = false
  }
}

// Construye lista unificada de eventos del mes visible
const eventosDelMes = computed(() => {
  const out = []
  const primerDia = new Date(anioVer.value, mesVer.value - 1, 1)
  const ultimoDia = new Date(anioVer.value, mesVer.value, 0)

  // 1) Gastos planificados del mes
  if (filtrosActivos.value.has('planificado')) {
    for (const g of planificados.value) {
      if (!g.fechaProbablePago) continue
      out.push({
        tipo: 'planificado',
        id: g.id,
        fecha: g.fechaProbablePago,
        titulo: g.concepto,
        monto: Number(g.montoEstimado) || 0,
        signo: -1,
        color: g.categoriaColor || '#8b5cf6',
        icono: g.categoriaIcono || '📋',
      })
    }
  }

  // 3) Deudas con fecha de pago en el mes
  if (filtrosActivos.value.has('deuda')) {
    for (const d of deudasConFecha.value) {
      if (!d.fechaPago) continue
      if (d.fechaPago < toIso(primerDia) || d.fechaPago > toIso(ultimoDia)) continue
      const monto = Number(d.montoPendiente ?? d.montoOriginal) || 0
      out.push({
        tipo: 'deuda',
        id: d.id,
        fecha: d.fechaPago,
        titulo: d.descripcion || d.personaNombre || 'Deuda',
        monto,
        signo: d.tipoDeuda === 'me_deben' ? 1 : -1,
        color: d.tipoDeuda === 'me_deben' ? '#10b981' : '#f59e0b',
        icono: '💳',
      })
    }
  }

  return out.sort((a, b) => a.fecha.localeCompare(b.fecha))
})

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const celdas = computed(() => {
  const primerDia = new Date(anioVer.value, mesVer.value - 1, 1)
  const ultimoDia = new Date(anioVer.value, mesVer.value, 0).getDate()
  // Lunes = 0 en nuestra grilla (L M X J V S D)
  const offset = (primerDia.getDay() + 6) % 7
  const hoyIso = toIso(new Date())
  const eventosPorFecha = new Map()
  for (const ev of eventosDelMes.value) {
    if (!eventosPorFecha.has(ev.fecha)) eventosPorFecha.set(ev.fecha, [])
    eventosPorFecha.get(ev.fecha).push(ev)
  }
  const cells = []
  for (let i = 0; i < offset; i++) cells.push({ dia: null })
  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = `${anioVer.value}-${String(mesVer.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      dia: d,
      fecha,
      esHoy: fecha === hoyIso,
      eventos: eventosPorFecha.get(fecha) || [],
    })
  }
  // padding final hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push({ dia: null })
  return cells
})

const diaSel = ref(null)
useOverlayBack(computed(() => diaSel.value !== null), () => { diaSel.value = null })
const eventosDia = computed(() => {
  if (!diaSel.value) return []
  return eventosDelMes.value.filter(e => e.fecha === diaSel.value)
})

function abrirDia(fecha) { diaSel.value = fecha }

function fechaCorta(f) {
  if (!f) return ''
  const d = new Date(f + 'T00:00:00')
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function etiquetaTipo(t) {
  return filtros.find(f => f.valor === t)?.etiqueta || t
}

onMounted(cargar)
</script>
