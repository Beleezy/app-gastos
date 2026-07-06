<template>
  <div class="flex items-center justify-between" :class="containerClass" data-testid="month-selector">
    <button
      class="p-2.5 rounded-xl bg-theme-card text-theme-text-muted active:bg-theme-border-md active:scale-95 transition-all border border-theme-border"
      data-testid="btn-mes-prev"
      @click="$emit('prev')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <div class="text-center">
      <button
        class="text-lg font-bold text-theme-text hover:text-theme-accent transition-colors"
        data-testid="mes-actual"
        :disabled="esActual"
        @click="$emit('goToCurrent')"
      >
        {{ label }}
      </button>
      <p v-if="esActual && showCurrentLabel" class="text-[0.6875rem] text-theme-accent/70 font-medium mt-0.5">Mes actual</p>
      <p v-else-if="!esActual && showCurrentLabel" class="text-[0.6875rem] text-theme-accent/60 font-medium mt-0.5">Toca para ir al mes actual</p>
    </div>

    <button
      class="p-2.5 rounded-xl transition-all border border-theme-border"
      :class="disableNext ? 'bg-theme-card text-theme-text-muted opacity-40 cursor-not-allowed' : 'bg-theme-card text-theme-text-muted active:bg-theme-border-md active:scale-95'"
      data-testid="btn-mes-next"
      :disabled="disableNext"
      @click="$emit('next')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  esActual: { type: Boolean, default: false },
  disableNext: { type: Boolean, default: false },
  showCurrentLabel: { type: Boolean, default: true },
  containerClass: { type: String, default: '' },
})

defineEmits(['prev', 'next', 'goToCurrent'])
</script>
