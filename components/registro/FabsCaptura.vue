<template>
  <div class="fixed bottom-24 right-4 z-40 lg:hidden">
    <div class="flex items-end gap-3">
      <!-- FAB Foto -->
      <button
        class="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 active:scale-90 transition-all"
        aria-label="Escanear voucher"
        @click="onPhoto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
      </button>

      <!-- FAB Microfono (prominente) -->
      <div class="relative">
        <!-- Pulse rings cuando escucha -->
        <div
          v-if="isListening"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div class="absolute w-16 h-16 rounded-full bg-red-500/30 animate-ping-slow"></div>
          <div class="absolute w-20 h-20 rounded-full bg-red-500/15 animate-ping-slower"></div>
        </div>

        <button
          class="relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
          :class="[
            isListening
              ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-xl shadow-red-500/40'
              : 'bg-gradient-to-br from-[var(--color-accent)] to-indigo-600 shadow-xl shadow-[var(--color-accent)]/40'
          ]"
          :disabled="!isSupported"
          :aria-label="isListening ? 'Detener grabacion' : 'Registrar por voz'"
          @click="onVoiceToggle"
        >
          <!-- Mic icon -->
          <svg v-if="!isListening" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-theme-on-accent drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          <!-- Stop icon -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>

          <!-- Draft indicator -->
          <span
            v-if="hasDraft && !isListening"
            class="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-theme-bg"
            aria-label="Borrador pendiente"
          ></span>
        </button>
      </div>

      <!-- FAB Manual -->
      <button
        class="w-12 h-12 rounded-full flex items-center justify-center bg-theme-card border border-theme-border shadow-lg shadow-black/20 text-theme-accent active:scale-90 transition-all"
        aria-label="Agregar gasto manual"
        @click="onManual"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isListening: { type: Boolean, default: false },
  hasDraft: { type: Boolean, default: false },
  isSupported: { type: Boolean, default: true },
})

const emit = defineEmits(['voice-toggle', 'photo', 'manual'])

const { vibrate } = useHaptic()

function onVoiceToggle() {
  vibrate(20)
  emit('voice-toggle')
}

function onPhoto() {
  vibrate(15)
  emit('photo')
}

function onManual() {
  vibrate(15)
  emit('manual')
}
</script>

<style scoped>
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}
@keyframes ping-slower {
  0% { transform: scale(1); opacity: 0.3; }
  100% { transform: scale(2); opacity: 0; }
}
.animate-ping-slow {
  animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-ping-slower {
  animation: ping-slower 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
