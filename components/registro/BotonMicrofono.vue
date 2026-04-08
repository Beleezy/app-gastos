<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Status text -->
    <p class="text-sm h-5 font-medium">
      <span v-if="isListening" class="text-blue-400 animate-pulse">Escuchando...</span>
      <span v-else-if="hasDraft" class="text-amber-400">Borrador guardado</span>
      <span v-else class="text-gray-500">Toca para registrar un gasto</span>
    </p>

    <!-- Mic button -->
    <div class="relative">
      <!-- Outer glow ring -->
      <div
        class="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
        :class="isListening ? 'opacity-100' : 'opacity-0'"
      >
        <div class="absolute w-28 h-28 rounded-full bg-blue-500/10 animate-ping-slow"></div>
        <div class="absolute w-36 h-36 rounded-full bg-blue-500/5 animate-ping-slower"></div>
      </div>

      <!-- Idle ambient glow -->
      <div v-if="!isListening && !hasDraft" class="absolute inset-0 flex items-center justify-center">
        <div class="w-24 h-24 rounded-full bg-blue-500/8 blur-xl"></div>
      </div>

      <button
        class="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 mic-btn"
        :class="[
          isListening
            ? 'bg-gradient-to-br from-red-500/55 to-rose-600/55 shadow-xl shadow-red-500/30 backdrop-blur-md'
            : 'bg-gradient-to-br from-blue-500/55 to-indigo-600/55 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 backdrop-blur-md'
        ]"
        :disabled="!isSupported"
        @click="toggleListening"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <!-- Mic icon -->
        <svg v-if="!isListening" xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
        <!-- Stop icon -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
    </div>

    <!-- Audio wave visualization (real AudioContext data) -->
    <div v-if="isListening" class="flex items-center gap-1.5 h-8">
      <div v-for="(level, i) in audioLevels" :key="i"
        class="w-1 rounded-full transition-all duration-75"
        :class="i % 2 === 0 ? 'bg-blue-400' : 'bg-indigo-400'"
        :style="{ height: `${level}px` }"
      ></div>
    </div>

    <!-- Draft card -->
    <div v-if="hasDraft && !isListening" class="w-full max-w-sm">
      <div class="bg-primary-800/90 rounded-2xl px-4 py-3 border border-amber-500/20 shadow-lg shadow-amber-500/5">
        <div class="flex items-center gap-1.5 mb-2">
          <div class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
          <p class="text-xs text-amber-400/80 font-medium">Borrador</p>
        </div>

        <!-- Editable text -->
        <div v-if="isEditing">
          <textarea
            v-model="editText"
            class="draft-textarea w-full bg-primary-900/60 border border-primary-600/40 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-blue-500/50"
            rows="3"
            @keydown.enter.ctrl="saveEdit"
          ></textarea>
          <div class="flex items-center gap-2 mt-2">
            <button
              class="flex-1 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors"
              @click="saveEdit"
            >
              Guardar
            </button>
            <button
              class="flex-1 py-1.5 rounded-lg bg-primary-700/30 text-gray-400 text-xs font-medium hover:bg-primary-700/50 transition-colors"
              @click="cancelEdit"
            >
              Cancelar
            </button>
          </div>
        </div>

        <!-- Read-only text -->
        <p v-else class="text-sm text-gray-300 italic">"{{ transcript }}"</p>

        <!-- Draft actions -->
        <div v-if="!isEditing" class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-primary-700/40">
          <!-- Send -->
          <button
            class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 active:bg-emerald-500/35 transition-colors"
            @click="$emit('send')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Enviar
          </button>
          <!-- Edit -->
          <button
            class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 active:bg-amber-500/35 transition-colors"
            @click="startEdit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Editar
          </button>
          <!-- Overwrite (re-record) -->
          <button
            class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 active:bg-blue-500/35 transition-colors"
            @click="$emit('overwrite')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regrabar
          </button>
          <!-- Delete -->
          <button
            class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 active:bg-red-500/30 transition-colors"
            @click="$emit('discard')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Live transcript while recording (no draft yet) -->
    <div v-if="isListening && transcript" class="w-full max-w-sm">
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
const emit = defineEmits(['start', 'stop', 'continue', 'send', 'discard', 'overwrite', 'update:transcript'])
const props = defineProps({
  isListening: Boolean,
  transcript: String,
  error: String,
  hasDraft: Boolean,
  isSupported: { type: Boolean, default: true },
})

const isEditing = ref(false)
const editText = ref('')

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

watch(() => props.isListening, (val) => {
  if (val) startWaveAnimation()
  else stopWaveAnimation()
})

onUnmounted(stopWaveAnimation)

function startEdit() {
  editText.value = props.transcript
  isEditing.value = true
  nextTick(() => {
    const el = document.querySelector('.draft-textarea')
    if (el) el.focus()
  })
}

function saveEdit() {
  emit('update:transcript', editText.value)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

// Modo tap: toggle normal
function toggleListening() {
  if (props.isListening) {
    emit('stop')
  } else {
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
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}
@keyframes ping-slower {
  0% { transform: scale(1); opacity: 0.3; }
  100% { transform: scale(2); opacity: 0; }
}
@keyframes wave {
  0%, 100% { height: 6px; }
  50% { height: 26px; }
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
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
}
</style>
