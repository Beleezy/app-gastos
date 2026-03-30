<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Status text -->
    <p class="text-sm text-gray-400 h-5">
      <span v-if="isListening" class="text-indigo-400">Escuchando...</span>
      <span v-else-if="transcript">Toca para volver a grabar</span>
      <span v-else>Toca para registrar un gasto</span>
    </p>

    <!-- Mic button -->
    <div class="relative">
      <!-- Pulse rings when listening -->
      <div v-if="isListening" class="absolute inset-0 flex items-center justify-center">
        <div class="absolute w-24 h-24 rounded-full bg-indigo-500/20 animate-ping-slow"></div>
        <div class="absolute w-32 h-32 rounded-full bg-indigo-500/10 animate-ping-slower"></div>
      </div>

      <button
        class="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-xl"
        :class="[
          isListening
            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
            : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/40'
        ]"
        :disabled="!isSupported"
        @click="toggleListening"
      >
        <!-- Mic icon -->
        <svg v-if="!isListening" xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
        <!-- Stop icon -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
    </div>

    <!-- Audio wave visualization -->
    <div v-if="isListening" class="flex items-center gap-1 h-8">
      <div v-for="i in 5" :key="i"
        class="w-1 bg-indigo-400 rounded-full animate-wave"
        :style="{ animationDelay: `${i * 0.1}s`, height: `${12 + Math.random() * 20}px` }"
      ></div>
    </div>

    <!-- Transcript preview -->
    <div v-if="transcript" class="w-full max-w-sm">
      <div class="bg-primary-800/80 rounded-xl px-4 py-3 border border-primary-700/50">
        <p class="text-sm text-gray-300 italic">"{{ transcript }}"</p>
      </div>
    </div>

    <!-- Error message -->
    <p v-if="error" class="text-red-400 text-xs text-center px-4">{{ error }}</p>

    <!-- Not supported message -->
    <p v-if="!isSupported" class="text-yellow-500 text-xs text-center px-4">
      Tu navegador no soporta reconocimiento de voz. Usa el formulario manual.
    </p>
  </div>
</template>

<script setup>
const emit = defineEmits(['start', 'stop'])
const props = defineProps({
  isListening: Boolean,
  transcript: String,
  error: String,
  isSupported: { type: Boolean, default: true },
})

function toggleListening() {
  if (props.isListening) {
    emit('stop')
  } else {
    emit('start')
  }
}
</script>

<style scoped>
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes ping-slower {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(2); opacity: 0; }
}
@keyframes wave {
  0%, 100% { height: 8px; }
  50% { height: 28px; }
}
.animate-ping-slow {
  animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-ping-slower {
  animation: ping-slower 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-wave {
  animation: wave 0.8s ease-in-out infinite;
}
</style>
