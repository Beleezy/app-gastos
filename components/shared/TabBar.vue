<template>
  <div
    role="tablist"
    :aria-label="ariaLabel"
    :class="[containerClass, scrollable ? 'overflow-x-auto pb-1 scrollbar-hide' : '']"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :aria-controls="tab.controls"
      :data-testid="tab.testid || `tab-${tab.value}`"
      class="shrink-0 transition-colors flex items-center gap-1.5 font-medium"
      :class="[
        sizeClass,
        modelValue === tab.value ? activeClass(tab) : inactiveClass(tab),
      ]"
      @click="select(tab)"
    >
      <slot name="prepend" :tab="tab" :active="modelValue === tab.value" />
      <span>{{ tab.label }}</span>
      <span
        v-if="tab.badge != null && tab.badge !== 0"
        class="px-1.5 py-0 rounded-full text-[10px] font-bold"
        :class="modelValue === tab.value ? 'bg-theme-on-accent/20' : 'bg-theme-border-md text-theme-text-muted'"
      >{{ tab.badge }}</span>
      <slot name="append" :tab="tab" :active="modelValue === tab.value" />
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: [String, Number], required: true },
  tabs: {
    type: Array,
    required: true,
    validator: (arr) => arr.every((t) => 'value' in t && 'label' in t),
  },
  variant: {
    type: String,
    default: 'pills',
    validator: (v) => ['pills', 'card', 'underline'].includes(v),
  },
  size: {
    type: String,
    default: 'sm',
    validator: (v) => ['xs', 'sm', 'md'].includes(v),
  },
  ariaLabel: { type: String, default: 'Pestañas' },
  scrollable: { type: Boolean, default: false },
  containerClass: { type: String, default: 'flex items-center gap-2' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const { vibrate } = useHaptic()

function select(tab) {
  if (tab.value === props.modelValue) return
  vibrate(10)
  emit('update:modelValue', tab.value)
  emit('change', tab.value)
}

const sizeClass = computed(() => ({
  xs: 'px-2.5 py-1 text-[11px] rounded-full',
  sm: 'px-3 py-1.5 text-xs rounded-full',
  md: 'px-4 py-2 text-sm rounded-xl',
}[props.size]))

function activeClass(tab) {
  if (tab.activeClass) return tab.activeClass
  return {
    pills: 'bg-theme-accent text-theme-on-accent',
    card: 'bg-theme-accent-bg text-theme-accent border border-theme-accent',
    underline: 'text-theme-accent border-b-2 border-theme-accent rounded-none',
  }[props.variant]
}

function inactiveClass(tab) {
  if (tab.inactiveClass) return tab.inactiveClass
  return {
    pills: 'bg-theme-card text-theme-text-sec border border-theme-border hover:text-theme-text',
    card: 'bg-theme-card text-theme-text-sec border border-theme-border hover:text-theme-text',
    underline: 'text-theme-text-muted border-b-2 border-transparent rounded-none hover:text-theme-text-sec',
  }[props.variant]
}
</script>
