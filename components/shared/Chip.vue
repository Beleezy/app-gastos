<!--
  Componente <Chip /> unificado para badges, estados y filtros.
  Usado por el rediseño UI V2. Reemplaza los múltiples patrones de
  "px-2 py-0.5 rounded-full text-[0.6875rem]" duplicados.

  Variantes: success | warning | danger | accent | neutral
  Tamaños:   sm (badge ~22px) | md (filtro/chip ~44px tap target)
  Interactivo: si interactive=true, agrega hover/active states y min-height 44px
-->
<template>
  <component
    :is="interactive ? 'button' : 'span'"
    :class="[
      'inline-flex items-center gap-1.5 font-semibold transition-colors select-none',
      sizeClasses,
      variantClasses,
      interactive ? 'cursor-pointer active:scale-95 transition-transform' : '',
    ]"
    :type="interactive ? 'button' : undefined"
  >
    <span v-if="$slots.icon || icon" class="shrink-0 flex items-center">
      <slot name="icon">{{ icon }}</slot>
    </span>
    <span class="truncate"><slot /></span>
    <span v-if="$slots.count || count !== null" class="text-[0.7em] opacity-75 font-bold">
      <slot name="count">{{ count }}</slot>
    </span>
  </component>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'neutral',
    validator: (v) => ['success', 'warning', 'danger', 'accent', 'neutral'].includes(v),
  },
  size: {
    type: String,
    default: 'sm',
    validator: (s) => ['sm', 'md'].includes(s),
  },
  icon: { type: String, default: '' },
  count: { type: [Number, String, null], default: null },
  interactive: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
})

const sizeClasses = computed(() => {
  if (props.size === 'md') {
    return 'px-3.5 py-2 rounded-full text-sm tap-44'
  }
  return 'px-2 py-0.5 rounded-full text-[0.6875rem]'
})

const variantClasses = computed(() => {
  if (props.active) {
    return 'bg-theme-accent text-theme-on-accent border border-theme-accent'
  }
  switch (props.variant) {
    case 'success':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
    case 'warning':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
    case 'danger':
      return 'bg-red-500/15 text-red-400 border border-red-500/20'
    case 'accent':
      return 'bg-theme-accent-bg text-theme-accent border border-theme-accent/20'
    case 'neutral':
    default:
      return 'bg-theme-border-md/60 text-theme-text-sec border border-theme-border'
  }
})
</script>
