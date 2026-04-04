<template>
  <!-- card variant -->
  <div v-if="variant === 'card'" class="bg-primary-800 rounded-xl p-4 animate-pulse">
    <div class="flex gap-3">
      <div class="w-12 h-12 rounded-full bg-primary-700 shrink-0"></div>
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-primary-700 rounded w-3/4"></div>
        <div class="h-3 bg-primary-700 rounded w-1/2"></div>
        <div class="h-3 bg-primary-700 rounded w-1/3"></div>
      </div>
    </div>
  </div>

  <!-- list-item variant -->
  <div v-else-if="variant === 'list-item'" class="bg-primary-800/60 rounded-xl h-14 animate-pulse shimmer"></div>

  <!-- chart variant -->
  <div v-else-if="variant === 'chart'" class="bg-primary-800 rounded-xl p-4 animate-pulse">
    <div class="flex items-end justify-around h-24 gap-2">
      <div v-for="i in 6" :key="i" class="flex-1 bg-primary-700 rounded-t" :style="{ height: `${30 + i * 10}%` }"></div>
    </div>
    <div class="h-3 bg-primary-700 rounded w-1/2 mx-auto mt-3"></div>
  </div>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'card',
    validator: v => ['card', 'list-item', 'chart'].includes(v),
  },
})
</script>
