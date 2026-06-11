<template>
  <div class="flex items-center justify-between mb-3">
    <button
      class="w-11 h-11 rounded-2xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-text-muted active:scale-95 transition-transform"
      aria-label="Mes anterior"
      @click="$emit('prev')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
    </button>
    <p class="text-base font-bold text-theme-text capitalize">{{ label }}</p>
    <button
      class="w-11 h-11 rounded-2xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-text-muted active:scale-95 transition-transform"
      aria-label="Mes siguiente"
      @click="$emit('next')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
    </button>
  </div>
</template>

<script setup>
defineProps({ label: { type: String, default: '' } })
defineEmits(['prev', 'next'])
</script>
