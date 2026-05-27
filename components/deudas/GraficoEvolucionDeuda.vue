<template>
  <div v-if="puntos.length >= 2" class="bg-theme-card rounded-xl p-3 border border-theme-border mb-4">
    <p class="text-[10px] text-theme-text-sec uppercase tracking-wider font-semibold mb-2">Evolución del saldo</p>

    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" :height="H" preserveAspectRatio="none">
      <!-- Área bajo la curva -->
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.25" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <path :d="areaPath" :fill="`url(#${gradId})`" />
      <!-- Línea -->
      <polyline
        :points="polylinePoints"
        fill="none"
        :stroke="color"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Puntos -->
      <circle
        v-for="(p, i) in puntos"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        r="2.5"
        :fill="color"
      />
    </svg>

    <!-- Etiquetas extremos -->
    <div class="flex items-center justify-between mt-1">
      <span class="text-[9px] text-theme-text-muted">{{ etiquetaInicio }}</span>
      <span class="text-[9px] text-theme-text-sec">{{ currencySymbol }}&nbsp;{{ formatMonto(montoActual) }}</span>
      <span class="text-[9px] text-theme-text-muted">{{ etiquetaFin }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  pagos: { type: Array, default: () => [] },
  montoOriginalTotal: { type: Number, default: 0 },
  montoActual: { type: Number, default: 0 },
  color: { type: String, default: '#10b981' },
})

const W = 300
const H = 56
const PAD = 6

const gradId = `grad-deuda-${Math.random().toString(36).slice(2, 9)}`

const { currencySymbol, formatMonto } = useCurrency()

// Construir serie temporal: inicio = montoOriginalTotal, luego restamos pagos acumulados
const puntos = computed(() => {
  if (props.pagos.length === 0) return []

  // Aplanar todos los pagos individuales
  const pagosFlat = props.pagos
    .flatMap(g => g.detalles || [])
    .filter(d => d.fechaPago)
    .sort((a, b) => a.fechaPago.localeCompare(b.fechaPago))

  if (pagosFlat.length === 0) return []

  const serie = [{ fecha: pagosFlat[0].fechaPago, monto: props.montoOriginalTotal }]
  let pendiente = props.montoOriginalTotal
  for (const p of pagosFlat) {
    pendiente = Math.max(0, pendiente - p.montoPagado)
    serie.push({ fecha: p.fechaPago, monto: pendiente })
  }

  const maxM = Math.max(...serie.map(s => s.monto)) || 1
  const n = serie.length

  return serie.map((s, i) => ({
    x: PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2),
    y: PAD + (1 - s.monto / maxM) * (H - PAD * 2),
    monto: s.monto,
    fecha: s.fecha,
  }))
})

const polylinePoints = computed(() =>
  puntos.value.map(p => `${p.x},${p.y}`).join(' ')
)

const areaPath = computed(() => {
  if (puntos.value.length < 2) return ''
  const pts = puntos.value
  const bottom = H - PAD
  return `M ${pts[0].x},${bottom} ` +
    pts.map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x},${bottom} Z`
})

function formatFechaCorta(fecha) {
  if (!fecha) return ''
  const [, m, d] = fecha.split('-')
  return `${parseInt(d)}/${parseInt(m)}`
}

const etiquetaInicio = computed(() =>
  puntos.value.length > 0 ? formatFechaCorta(puntos.value[0].fecha) : ''
)
const etiquetaFin = computed(() =>
  puntos.value.length > 0 ? formatFechaCorta(puntos.value[puntos.value.length - 1].fecha) : ''
)
</script>
