<template>
  <div class="flex flex-col items-center" :class="hideStatus ? 'gap-3' : 'gap-4'">
    <!-- Status text (oculto cuando se controla externamente) -->
    <p v-if="!hideStatus" class="text-sm h-5 font-medium">
      <span v-if="isListening" class="text-theme-accent animate-pulse">Escuchando...</span>
      <span v-else-if="hasDraft" class="text-amber-400">Borrador guardado</span>
      <span v-else class="text-theme-text-sec">Toca para registrar un gasto</span>
    </p>

    <!-- Mic button -->
    <div class="relative">
      <!-- Outer glow ring -->
      <div
        class="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
        :class="isListening ? 'opacity-100' : 'opacity-0'"
      >
        <div
          class="absolute w-28 h-28 rounded-full bg-[var(--color-accent)]/10 animate-ping-slow"
        ></div>
        <div
          class="absolute w-36 h-36 rounded-full bg-[var(--color-accent)]/5 animate-ping-slower"
        ></div>
      </div>

      <!-- Idle ambient glow -->
      <div
        v-if="!isListening && !hasDraft"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="w-24 h-24 rounded-full bg-[var(--color-accent)]/8 blur-xl"></div>
      </div>

      <button
        data-testid="btn-microfono"
        class="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 mic-btn"
        :class="[
          isListening
            ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-xl shadow-red-500/30'
            : 'bg-gradient-to-br from-[var(--color-accent)] to-indigo-600 shadow-xl shadow-[var(--color-accent)]/30 hover:shadow-[var(--color-accent)]/40',
        ]"
        :disabled="!isSupported"
        @click="toggleListening"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <!-- Mic icon -->
        <svg
          v-if="!isListening"
          xmlns="http://www.w3.org/2000/svg"
          class="w-9 h-9 text-theme-on-accent drop-shadow-sm"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
        <!-- Stop icon -->
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="w-8 h-8 text-white drop-shadow-sm"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
    </div>

    <!-- Audio wave visualization (real AudioContext data) -->
    <div v-if="isListening" class="flex items-center gap-1.5 h-8">
      <div
        v-for="(level, i) in audioLevels"
        :key="i"
        class="w-1 rounded-full transition-all duration-75"
        :class="i % 2 === 0 ? 'bg-theme-accent' : 'bg-indigo-400'"
        :style="{ height: `${level}px` }"
      ></div>
    </div>

    <!-- Live transcript while recording (no draft yet) — se oculta cuando el padre lo controla -->
    <div v-if="!hideTranscript && isListening && transcript" class="w-full max-w-sm">
      <div class="bg-theme-card rounded-xl px-4 py-3 border border-theme-border">
        <p class="text-sm text-theme-text-sec italic">"{{ transcript }}"</p>
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
const emit = defineEmits(['start', 'stop', 'continue'])
const props = defineProps({
  isListening: Boolean,
  transcript: String,
  error: String,
  hasDraft: Boolean,
  isSupported: { type: Boolean, default: true },
  hideStatus: { type: Boolean, default: false },
  hideTranscript: { type: Boolean, default: false },
})

const { vibrate } = useHaptic()

// Audio wave visualization (CSS animation only — avoids getUserMedia conflicting with SpeechRecognition on mobile)
const audioLevels = ref(Array(7).fill(8))
let cssWaveTimer = null

function startWaveAnimation() {
  let tick = 0
  cssWaveTimer = setInterval(() => {
    tick++
    audioLevels.value = Array.from({ length: 7 }, (_, i) => {
      return Math.max(4, Math.round(8 + 14 * Math.abs(Math.sin((tick + i * 1.3) * 0.4))))
    })
  }, 80)
}

function stopWaveAnimation() {
  if (cssWaveTimer) {
    clearInterval(cssWaveTimer)
    cssWaveTimer = null
  }
  audioLevels.value = Array(7).fill(8)
}

watch(
  () => props.isListening,
  (val) => {
    if (val) startWaveAnimation()
    else stopWaveAnimation()
  },
)

onUnmounted(stopWaveAnimation)

// Modo tap: toggle normal
function toggleListening() {
  if (props.isListening) {
    vibrate(20)
    emit('stop')
  } else {
    vibrate(30)
    emit('start')
  }
}

// Modo walkie-talkie: mantener presionado para grabar
let holdTimer = null
let isHoldMode = false

function onPointerDown() {
  if (props.isListening || props.hasDraft) return
  holdTimer = setTimeout(() => {
    isHoldMode = true
    vibrate(30)
    emit('start')
  }, 350)
}

function onPointerUp() {
  clearTimeout(holdTimer)
  if (isHoldMode) {
    isHoldMode = false
    if (props.isListening) emit('stop')
  }
}
</script>

<style scoped>
@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
@keyframes ping-slower {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}
@keyframes wave {
  0%,
  100% {
    height: 6px;
  }
  50% {
    height: 26px;
  }
}
.animate-ping-slow {
  animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-ping-slower {
  animation: ping-slower 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-wave {
  animation: wave 0.7s ease-in-out infinite;
}
.mic-btn {
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease;
}
</style>
