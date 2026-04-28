<template>
  <div :aria-busy="true" :aria-live="'polite'" class="skeleton-wrapper">
    <template v-for="i in normalizedCount" :key="i">
      <!-- line variant -->
      <div
        v-if="variant === 'line'"
        class="h-4 bg-theme-border-md rounded animate-pulse shimmer"
        :class="lineWidthClass"
      ></div>

      <!-- avatar variant -->
      <div
        v-else-if="variant === 'avatar'"
        class="rounded-full bg-theme-border-md animate-pulse shimmer"
        :class="avatarSizeClass"
      ></div>

      <!-- card variant -->
      <div v-else-if="variant === 'card'" class="bg-theme-card rounded-xl p-4 animate-pulse">
        <div class="flex gap-3">
          <div class="w-12 h-12 rounded-full bg-theme-border-md shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-theme-border-md rounded w-3/4"></div>
            <div class="h-3 bg-theme-border-md rounded w-1/2"></div>
            <div class="h-3 bg-theme-border-md rounded w-1/3"></div>
          </div>
        </div>
      </div>

      <!-- list-item variant -->
      <div
        v-else-if="variant === 'list-item'"
        class="bg-theme-card rounded-xl h-14 animate-pulse shimmer"
        :class="i > 1 ? 'mt-2' : ''"
      ></div>

      <!-- chart variant -->
      <div v-else-if="variant === 'chart'" class="bg-theme-card rounded-xl p-4 animate-pulse">
        <div class="flex items-end justify-around h-24 gap-2">
          <div
            v-for="b in 6"
            :key="b"
            class="flex-1 bg-theme-border-md rounded-t"
            :style="{ height: `${30 + b * 10}%` }"
          ></div>
        </div>
        <div class="h-3 bg-theme-border-md rounded w-1/2 mx-auto mt-3"></div>
      </div>
    </template>
    <span class="sr-only">Cargando…</span>
  </div>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'card',
    validator: (v) => ['card', 'list-item', 'chart', 'line', 'avatar'].includes(v),
  },
  count: {
    type: Number,
    default: 1,
  },
  width: {
    type: String,
    default: 'full',
    validator: (v) => ['full', '3/4', '1/2', '1/3', '1/4'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
})

const normalizedCount = computed(() => Math.max(1, Math.min(props.count, 50)))

const lineWidthClass = computed(() => {
  return {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  }[props.width]
})

const avatarSizeClass = computed(() => {
  return {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[props.size]
})
</script>

<style scoped>
.skeleton-wrapper {
  display: contents;
}
</style>
