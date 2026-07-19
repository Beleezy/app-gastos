<template>
  <button
    :type="type"
    :aria-label="ariaLabel"
    :data-testid="dataTestid"
    :class="[
      'flex items-center justify-center rounded-full shadow-lg transition-all duration-300 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClass,
      toneClass,
      pulse ? 'fab-pulse' : '',
    ]"
    :disabled="disabled"
    @click="onClick"
  >
    <slot>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 drop-shadow-sm"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </slot>
  </button>
</template>

<script setup>
const props = defineProps({
  tone: {
    type: String,
    default: 'accent',
    validator: (v) => ['accent', 'violet', 'emerald', 'purple', 'sky'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['md', 'lg'].includes(v),
  },
  pulse: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, required: true },
  type: { type: String, default: 'button' },
  dataTestid: { type: String, default: undefined },
})

const emit = defineEmits(['click'])

const { vibrate } = useHaptic()

function onClick(e) {
  vibrate(15)
  emit('click', e)
}

const sizeClass = computed(
  () =>
    ({
      md: 'h-12 w-12',
      lg: 'h-14 w-14',
    })[props.size],
)

const toneClass = computed(
  () =>
    ({
      accent:
        'bg-theme-accent text-theme-on-accent opacity-70 hover:opacity-85 shadow-theme-accent/25',
      violet: 'bg-violet-500 text-white opacity-90 hover:bg-violet-600 shadow-violet-500/30',
      emerald: 'bg-emerald-500 text-white opacity-70 hover:opacity-85 shadow-emerald-500/25',
      purple: 'bg-purple-600 text-white opacity-70 hover:opacity-85 shadow-purple-500/25',
      sky: 'bg-sky-500 text-white opacity-70 hover:opacity-85 shadow-sky-500/25',
    })[props.tone],
)
</script>
