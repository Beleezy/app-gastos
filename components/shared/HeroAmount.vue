<!--
  <HeroAmount /> — monto principal de una pantalla (presupuesto, total
  por cobrar, gastado en el mes, etc). Usado por el rediseño UI V2.

  Combina:
    - Etiqueta uppercase pequeña arriba
    - Currency + monto grande (2.25rem)
    - Subtítulo opcional con desglose
    - Delta chip opcional (vs mes anterior)
-->
<template>
  <div class="space-y-1">
    <p v-if="label" class="text-hero-label">{{ label }}</p>
    <div class="flex items-baseline gap-1">
      <span v-if="currency" class="text-xl font-medium text-theme-text-muted">{{ currency }}</span>
      <span class="text-hero" :class="amountToneClass" data-testid="hero-amount">{{
        formattedAmount
      }}</span>
    </div>
    <p v-if="sublabel" class="text-sm text-theme-text-sec">
      <slot name="sublabel">{{ sublabel }}</slot>
    </p>
    <div v-if="delta !== null && delta !== undefined" class="pt-1">
      <span
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
        :class="deltaToneClass"
      >
        <svg
          v-if="delta > 0"
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 17l9.2-9.2M17 17V8H8" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 7L7.8 16.2M7 7v9h9" />
        </svg>
        {{ delta > 0 ? '+' : '' }}{{ delta.toFixed(0) }}% {{ deltaLabel }}
      </span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  amount: { type: [Number, String], required: true },
  label: { type: String, default: '' },
  sublabel: { type: String, default: '' },
  currency: { type: String, default: '' },
  // tone: neutral | success | danger | accent. Pinta el monto.
  tone: { type: String, default: 'neutral' },
  // delta porcentual vs periodo anterior (-100..N)
  delta: { type: [Number, null], default: null },
  deltaLabel: { type: String, default: '' },
  // Si tone='auto-spend', amount>0 → danger, amount<0 → success
  formatFn: { type: Function, default: null },
})

const formattedAmount = computed(() => {
  if (props.formatFn) return props.formatFn(props.amount)
  const num = parseFloat(props.amount) || 0
  return num.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
})

const amountToneClass = computed(() => {
  switch (props.tone) {
    case 'success':
      return 'text-emerald-400'
    case 'danger':
      return 'text-red-400'
    case 'accent':
      return 'text-theme-accent'
    case 'neutral':
    default:
      return 'text-theme-text'
  }
})

const deltaToneClass = computed(() => {
  // Convención: delta positivo es "gastaste más" → rojo. Negativo → verde.
  // Si se quiere invertir (ej: ingresos), pasa delta negado.
  return props.delta > 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
})
</script>
