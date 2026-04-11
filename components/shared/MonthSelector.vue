<template>
  <div class="flex items-center justify-between" :class="containerClass">
    <button
      class="p-2.5 rounded-xl bg-primary-800/80 text-gray-400 active:bg-primary-700 active:scale-95 transition-all border border-primary-700/20"
      @click="$emit('prev')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <div class="text-center">
      <button
        class="text-lg font-bold text-white hover:text-theme-accent transition-colors"
        :disabled="esActual"
        @click="$emit('goToCurrent')"
      >
        {{ label }}
      </button>
      <p v-if="esActual && showCurrentLabel" class="text-[10px] text-theme-accent/70 font-medium mt-0.5">Mes actual</p>
      <p v-else-if="!esActual && showCurrentLabel" class="text-[10px] text-theme-accent/60 font-medium mt-0.5">Toca para ir al mes actual</p>
    </div>

    <button
      class="p-2.5 rounded-xl transition-all border border-primary-700/20"
      :class="disableNext ? 'bg-primary-800/40 text-gray-700 opacity-40 cursor-not-allowed' : 'bg-primary-800/80 text-gray-400 active:bg-primary-700 active:scale-95'"
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
