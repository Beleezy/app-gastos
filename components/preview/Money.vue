<template>
  <span class="tabular-nums whitespace-nowrap" :class="toneClass">{{ display }}</span>
</template>

<script setup>
// Moneda V3 — reglas del rediseño:
//  - Símbolo y monto unidos por espacio duro: nunca "S/" en una línea y el
//    número en la siguiente.
//  - Montos de hasta 4 cifras SIEMPRE completos (el usuario maneja miles
//    como máximo; "S/ 4,349" no debe colapsar a "S/ 4.3k").
//  - "k"/"M" únicamente desde 5 cifras (>= 10,000) y solo si `compact`.
//  - `entero`: oculta los decimales — para celdas estrechas (tripletas
//    Mín/Prom/Máx, tarjetas pequeñas) donde el texto grande no deja sitio.
const props = defineProps({
  value: { type: [Number, String], default: 0 },
  compact: { type: Boolean, default: false },
  entero: { type: Boolean, default: false },
  signo: { type: Boolean, default: false },
  tone: { type: String, default: 'none' }, // none | auto | red | green | sky | amber | violet | accent | muted
})

const { currencySymbol, currencyLocale, formatMonto } = useCurrency()
const NBSP = ' '

const num = computed(() => {
  const n = Number(props.value)
  return Number.isFinite(n) ? n : 0
})

function cuerpo(abs) {
  if (props.compact && abs >= 1_000_000) {
    return (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'M'
  }
  if (props.compact && abs >= 10_000) {
    return (abs / 1000).toFixed(abs >= 100_000 ? 0 : 1).replace(/\.0$/, '') + 'k'
  }
  if (props.entero) return Math.round(abs).toLocaleString(currencyLocale.value)
  return formatMonto(abs)
}

const display = computed(() => {
  const n = num.value
  let prefijo = ''
  if (n < 0) prefijo = '−'
  else if (props.signo && n > 0) prefijo = '+'
  return `${prefijo}${currencySymbol.value}${NBSP}${cuerpo(Math.abs(n))}`
})

const TONOS = {
  red: 'text-red-400',
  green: 'text-emerald-400',
  sky: 'text-sky-400',
  amber: 'text-amber-400',
  violet: 'text-violet-400',
  accent: 'text-theme-accent',
  muted: 'text-theme-text-muted',
}

const toneClass = computed(() => {
  if (props.tone === 'auto') return num.value < 0 ? 'text-red-400' : 'text-emerald-400'
  return TONOS[props.tone] || ''
})
</script>
