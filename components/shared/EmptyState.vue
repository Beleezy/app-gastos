<template>
  <div
    role="status"
    class="flex flex-col items-center justify-center text-center px-6 py-10"
    :class="compact ? 'py-6' : 'py-12'"
  >
    <div
      v-if="!hideIcon"
      class="flex items-center justify-center rounded-full mb-4"
      :class="[iconBgClass, compact ? 'w-12 h-12' : 'w-16 h-16']"
    >
      <span class="text-2xl" aria-hidden="true">{{ displayIcon }}</span>
    </div>
    <h3 v-if="title" class="text-base md:text-lg font-semibold text-theme-text mb-1">{{ title }}</h3>
    <p v-if="message" class="text-sm text-theme-text-sec max-w-xs">{{ message }}</p>
    <div v-if="actionLabel || $slots.actions" class="mt-4 flex flex-wrap gap-2 justify-center">
      <slot name="actions">
        <button
          v-if="actionLabel"
          type="button"
          class="min-h-[44px] px-4 rounded-lg bg-theme-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          :aria-label="actionLabel"
          @click="$emit('action')"
        >
          {{ actionLabel }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'empty',
    validator: (v) => ['empty', 'error', 'offline'].includes(v),
  },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  icon: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  hideIcon: { type: Boolean, default: false },
})

defineEmits(['action'])

const displayIcon = computed(() => {
  if (props.icon) return props.icon
  return {
    empty: '📭',
    error: '⚠️',
    offline: '📡',
  }[props.variant]
})

const iconBgClass = computed(() => {
  return {
    empty: 'bg-theme-border-md',
    error: 'bg-red-500/10',
    offline: 'bg-amber-500/10',
  }[props.variant]
})
</script>
