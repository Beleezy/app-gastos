<template>
  <div class="rounded-2xl border border-theme-border bg-theme-card px-4 pt-3 pb-4">
    <!-- Titulo dinamico al tope (1 sola linea) -->
    <p class="text-center text-xs font-medium h-4 mb-3">
      <span v-if="isListening" class="text-theme-accent animate-pulse">Escuchando...</span>
      <span v-else-if="hasDraft" class="text-amber-400">Borrador guardado</span>
      <span v-else class="text-theme-text-sec">Toca el microfono para registrar</span>
    </p>

    <!-- Trio: items-start para que los laterales no se muevan cuando la columna del mic crece -->
    <div class="flex items-start justify-center gap-5 sm:gap-7">
      <!-- Foto -->
      <button
        class="mt-3.5 w-[3.25rem] h-[3.25rem] rounded-2xl flex items-center justify-center bg-theme-input border border-theme-border text-amber-400 hover:bg-theme-card-hover active:scale-90 transition-all shadow-sm shadow-black/10 shrink-0"
        aria-label="Escanear voucher"
        data-testid="btn-camara"
        @click="onPhoto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
      </button>

      <!-- Microfono (centro, prominente) — columna fija de ancho para no empujar a los laterales -->
      <div class="flex flex-col items-center gap-1.5 shrink-0">
        <RegistroBotonMicrofono
          :is-listening="isListening"
          :transcript="transcript"
          :error="voiceError"
          :is-supported="isSupported"
          :has-draft="hasDraft"
          :hide-status="true"
          :hide-transcript="true"
          @start="$emit('voice-start')"
          @stop="$emit('voice-stop')"
          @continue="$emit('voice-continue')"
        />
        <span class="text-[0.7rem] font-medium text-theme-text-sec">Dictar voz</span>
      </div>

      <!-- Manual -->
      <button
        class="mt-3.5 w-[3.25rem] h-[3.25rem] rounded-2xl flex items-center justify-center bg-theme-input border border-theme-border text-theme-accent hover:bg-theme-card-hover active:scale-90 transition-all shadow-sm shadow-black/10 shrink-0"
        aria-label="Agregar gasto manual"
        data-testid="btn-registro-manual"
        @click="onManual"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Vista previa en vivo: full width debajo del trio, NO afecta a los laterales -->
    <Transition name="live-fade">
      <div v-if="isListening && transcript" class="mt-3 px-1">
        <div class="bg-theme-input/60 rounded-xl px-3.5 py-2.5 border border-theme-border">
          <p class="text-sm text-theme-text-sec italic leading-relaxed">"{{ transcript }}"</p>
        </div>
      </div>
    </Transition>

    <!-- Draft de voz (post-stop) -->
    <div class="mt-3 px-1">
      <RegistroDraftVoz
        :transcript="transcript"
        :has-draft="hasDraft"
        :is-listening="isListening"
        @send="$emit('draft-send')"
        @discard="$emit('draft-discard')"
        @overwrite="$emit('draft-overwrite')"
        @update:transcript="$emit('draft-update', $event)"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  isListening: { type: Boolean, default: false },
  transcript: { type: String, default: '' },
  voiceError: { type: String, default: '' },
  isSupported: { type: Boolean, default: true },
  hasDraft: { type: Boolean, default: false },
})

const emit = defineEmits([
  'voice-start',
  'voice-stop',
  'voice-continue',
  'photo',
  'manual',
  'draft-send',
  'draft-discard',
  'draft-overwrite',
  'draft-update',
])

const { vibrate } = useHaptic()

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
.live-fade-enter-active, .live-fade-leave-active {
  transition: all 0.2s ease;
}
.live-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.live-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
