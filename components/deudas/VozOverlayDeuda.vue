<template>
  <Transition name="voz-overlay">
    <div v-if="showVozOverlay" class="fixed inset-0 z-50 flex flex-col items-center justify-center">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cerrarVozOverlaySiInactivo"></div>

      <div class="relative z-10 flex flex-col items-center gap-4 px-6 w-full max-w-sm">
        <!-- Status text -->
        <p class="text-sm min-h-5">
          <span v-if="isListening" class="text-purple-400">Escuchando...</span>
          <span v-else-if="hasDraft" class="text-amber-400">Borrador guardado</span>
          <span v-else class="text-theme-text-muted">Toca para dictar una deuda</span>
        </p>

        <!-- Mic button -->
        <div class="relative">
          <div v-if="isListening" class="absolute inset-0 flex items-center justify-center">
            <div class="absolute w-24 h-24 rounded-full bg-purple-500/20 animate-ping-slow"></div>
            <div class="absolute w-32 h-32 rounded-full bg-purple-500/10 animate-ping-slower"></div>
          </div>
          <button
            class="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-xl"
            :class="isListening
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
              : 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/40'"
            @click="toggleVoz"
          >
            <svg v-if="!isListening" xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-theme-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-theme-text" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>

        <!-- Audio wave -->
        <div v-if="isListening" class="flex items-center gap-1 h-8">
          <div v-for="i in 5" :key="i"
            class="w-1 bg-purple-400 rounded-full animate-wave"
            :style="{ animationDelay: `${i * 0.1}s`, height: `${12 + Math.random() * 20}px` }"
          ></div>
        </div>

        <!-- Live transcript while recording -->
        <div v-if="isListening && transcript" class="w-full">
          <div class="bg-theme-card rounded-xl px-4 py-3 border border-theme-border">
            <p class="text-sm text-theme-text-sec italic">"{{ transcript }}"</p>
          </div>
        </div>

        <!-- Draft card (after recording stops) -->
        <div v-if="hasDraft && !isListening" class="w-full">
          <div class="bg-theme-card rounded-xl px-4 py-3 border border-amber-500/30">
            <p class="text-xs text-amber-400/70 mb-1.5">Borrador</p>

            <div v-if="isEditing">
              <textarea
                ref="editTextareaRef"
                v-model="editText"
                class="w-full bg-theme-input border border-primary-600/40 rounded-lg px-3 py-2 text-sm text-theme-text resize-none focus:outline-none focus:border-purple-500/50"
                rows="3"
                @keydown.enter.ctrl="saveEdit"
              ></textarea>
              <div class="flex items-center gap-2 mt-2">
                <button class="flex-1 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-medium hover:bg-purple-500/25" @click="saveEdit">
                  Guardar
                </button>
                <button class="flex-1 py-1.5 rounded-lg bg-theme-border-md text-theme-text-muted text-xs font-medium hover:bg-theme-border-md" @click="cancelEdit">
                  Cancelar
                </button>
              </div>
            </div>

            <p v-else class="text-sm text-theme-text-sec italic">"{{ transcript }}"</p>

            <div v-if="!isEditing" class="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-theme-border">
              <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-[0.6875rem] leading-tight font-medium hover:bg-emerald-500/25" @click="enviarDraft">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                Enviar
              </button>
              <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-amber-500/15 text-amber-400 text-[0.6875rem] leading-tight font-medium hover:bg-amber-500/25" @click="startEdit">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Editar
              </button>
              <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-purple-500/15 text-purple-400 text-[0.6875rem] leading-tight font-medium hover:bg-purple-500/25" @click="regrabar">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Regrabar
              </button>
              <button class="flex flex-col items-center gap-1 py-2 rounded-lg bg-red-500/10 text-red-400 text-[0.6875rem] leading-tight font-medium hover:bg-red-500/20" @click="descartarDraft">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <!-- Close button (when not recording and no draft) -->
        <button
          v-if="!isListening && !hasDraft"
          class="mt-2 px-6 py-2 rounded-xl text-sm text-theme-text-muted border border-theme-border hover:bg-theme-border-md transition-colors"
          @click="cerrarVozOverlay"
        >
          Cerrar
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const {
  isListening, transcript, editTextareaRef,
  showVozOverlay, hasDraft, isEditing, editText,
  cerrarVozOverlay, cerrarVozOverlaySiInactivo,
  toggleVoz, enviarDraft, startEdit, saveEdit, cancelEdit, regrabar, descartarDraft,
} = useVoiceDeuda()

useOverlayBack(showVozOverlay, cerrarVozOverlay)
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
.voz-overlay-enter-active {
  transition: all 0.3s ease-out;
}
.voz-overlay-leave-active {
  transition: all 0.2s ease-in;
}
.voz-overlay-enter-from,
.voz-overlay-leave-to {
  opacity: 0;
}
</style>
