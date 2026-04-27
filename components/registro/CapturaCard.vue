<template>
  <div class="rounded-2xl border border-theme-border bg-theme-card px-4 py-5">
    <div class="flex items-start justify-center gap-6 sm:gap-8">
      <!-- Foto -->
      <div class="pt-9 flex flex-col items-center gap-2">
        <button
          class="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 bg-gradient-to-br from-amber-500/60 to-orange-600/60 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
          aria-label="Escanear voucher"
          @click="onPhoto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </button>
        <span class="text-xs text-theme-text-sec font-medium">Foto</span>
      </div>

      <!-- Microfono (centro, prominente) -->
      <RegistroBotonMicrofono
        :is-listening="isListening"
        :transcript="transcript"
        :error="voiceError"
        :is-supported="isSupported"
        :has-draft="hasDraft"
        @start="$emit('voice-start')"
        @stop="$emit('voice-stop')"
        @continue="$emit('voice-continue')"
      />

      <!-- Manual -->
      <div class="pt-9 flex flex-col items-center gap-2">
        <button
          class="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 bg-theme-input border border-theme-border text-theme-accent hover:bg-theme-card-hover shadow-lg shadow-black/15"
          aria-label="Agregar gasto manual"
          @click="onManual"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span class="text-xs text-theme-text-sec font-medium">Manual</span>
      </div>
    </div>

    <!-- Draft de voz -->
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
