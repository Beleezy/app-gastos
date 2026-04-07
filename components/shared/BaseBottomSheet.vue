<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="relative w-full max-w-lg bg-theme-card rounded-t-3xl border-t border-theme-border max-h-[90vh] overflow-y-auto animate-slide-up">
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-theme-border-md"></div>
      </div>
      <div class="flex items-center justify-between px-5 pb-4">
        <h2 class="text-lg font-semibold text-theme-text">{{ title }}</h2>
        <button class="w-8 h-8 rounded-full bg-theme-border-md flex items-center justify-center text-theme-text-sec" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="px-5 pb-8 space-y-4">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, required: true } })
defineEmits(['close'])
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
