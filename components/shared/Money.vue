<template>
  <span class="tabular-nums whitespace-nowrap" :class="toneClass">{{ display }}</span>
</template>

<script setup>
// R1 - Componente unico de moneda.
//   - Simbolo y monto inseparables (espacio duro U+00A0) -> nunca saltan de linea.
//   - tabular-nums + whitespace-nowrap -> decimales alineados, sin cortes.
//   - Formato/locale centralizados en useCurrency (una sola fuente de verdad).
//   - `compact`: colapsa montos de 5+ cifras ("S/ 27.1k"); los de <=4 cifras
//     se muestran completos. Util en tarjetas estrechas.
//   - `entero`: oculta los decimales (".00") — para celdas estrechas donde el
//     texto grande no deja sitio; los montos de 4 cifras siguen completos.
//   - `signo`: antepone "+" a positivos (para flujos/saldos).
//   - `tone`: color semantico opcional.
const props = defineProps({
  value: { type: [Number, String], default: 0 },
  compact: { type: Boolean, default: false },
  entero: { type: Boolean, default: false },
  signo: { type: Boolean, default: false },
  tone: { type: String, default: 'none' }, // none | auto | red | green | sky | amber | accent | muted
})

const { currencySymbol, currencyLocale, formatMonto } = useCurrency()

const NBSP = ' '

const num = computed(() => {
  const n = Number(props.value)
  return Number.isFinite(n) ? n : 0
})

function formatCompacto(abs) {
  if (abs >= 1_000_000) {
    return (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'M'
  }
  if (abs >= 10_000) {
    return (abs / 1000).toFixed(abs >= 100_000 ? 0 : 1).replace(/\.0$/, '') + 'k'
  }
  // <= 4 cifras -> completo (no se colapsa).
  return cuerpoBase(abs)
}

function cuerpoBase(abs) {
  if (props.entero) return Math.round(abs).toLocaleString(currencyLocale.value)
  return formatMonto(abs)
}

const display = computed(() => {
  const n = num.value
  const abs = Math.abs(n)
  const cuerpo = props.compact ? formatCompacto(abs) : cuerpoBase(abs)
  let prefijo = ''
  if (n < 0) prefijo = '−' // signo menos tipografico
  else if (props.signo && n > 0) prefijo = '+'
  return `${prefijo}${currencySymbol.value}${NBSP}${cuerpo}`
})

const TONOS = {
  red: 'text-red-400',
  green: 'text-emerald-400',
  sky: 'text-sky-400',
  amber: 'text-amber-400',
  accent: 'text-theme-accent',
  muted: 'text-theme-text-muted',
}

const toneClass = computed(() => {
  if (props.tone === 'auto') return num.value < 0 ? 'text-red-400' : 'text-emerald-400'
  return TONOS[props.tone] || ''
})
</script>
