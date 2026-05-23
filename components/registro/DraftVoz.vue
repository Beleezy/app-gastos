<template>
  <Transition name="draft-slide">
    <div v-if="hasDraft && !isListening" class="w-full max-w-sm mx-auto">
      <div class="bg-theme-card rounded-2xl px-4 py-3 border border-amber-500/20 shadow-lg shadow-amber-500/5">
        <div class="flex items-center gap-1.5 mb-2">
          <div class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
          <p class="text-xs text-amber-400/80 font-medium">Borrador</p>
        </div>

        <!-- Editable text -->
        <div v-if="isEditing">
          <textarea
            ref="textareaRef"
            v-model="editText"
            class="draft-textarea w-full bg-theme-input border border-primary-600/40 rounded-lg px-3 py-2 text-sm text-theme-text resize-none focus:outline-none focus:border-theme-accent/50"
            rows="3"
            @keydown.enter.ctrl="saveEdit"
          ></textarea>
          <div class="flex items-center gap-2 mt-2">
            <button
              class="flex-1 py-1.5 rounded-lg bg-theme-accent-bg text-theme-accent text-xs font-medium hover:bg-theme-accent-bg-hover transition-colors"
              @click="saveEdit"
            >
              Guardar
            </button>
            <button
              class="flex-1 py-1.5 rounded-lg bg-theme-border-md text-theme-text-muted text-xs font-medium hover:bg-theme-border-md transition-colors"
              @click="cancelEdit"
            >
              Cancelar
            </button>
          </div>
        </div>

        <!-- Read-only text -->
        <p v-else class="text-sm text-theme-text-sec italic leading-relaxed">"{{ transcript }}"</p>

        <!-- Draft actions -->
        <div v-if="!isEditing" class="flex items-center gap-2 mt-3 pt-3 border-t border-theme-border">
          <!-- Send -->
          <button
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 active:bg-emerald-500/35 transition-colors"
            aria-label="Enviar"
            data-testid="btn-draft-enviar"
            @click="$emit('send')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span class="hidden sm:inline">Enviar</span>
          </button>
          <!-- Edit -->
          <button
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 active:bg-amber-500/35 transition-colors"
            aria-label="Editar"
            @click="startEdit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span class="hidden sm:inline">Editar</span>
          </button>
          <!-- Overwrite (re-record) -->
          <button
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-theme-accent-bg text-theme-accent text-xs font-medium hover:bg-theme-accent-bg-hover active:bg-[var(--color-accent)]/35 transition-colors"
            aria-label="Regrabar"
            @click="$emit('overwrite')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="hidden sm:inline">Regrabar</span>
          </button>
          <!-- Delete -->
          <button
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 transition-colors shrink-0"
            aria-label="Eliminar"
            @click="$emit('discard')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const emit = defineEmits(['send', 'discard', 'overwrite', 'update:transcript'])
const props = defineProps({
  transcript: String,
  hasDraft: Boolean,
  isListening: Boolean,
})

const isEditing = ref(false)
const editText = ref('')
const textareaRef = ref(null)

function startEdit() {
  editText.value = props.transcript
  isEditing.value = true
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

function saveEdit() {
  emit('update:transcript', editText.value)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}
</script>

<style scoped>
.draft-slide-enter-active {
  transition: all 0.3s ease-out;
}
.draft-slide-leave-active {
  transition: all 0.2s ease-in;
}
.draft-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.draft-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
