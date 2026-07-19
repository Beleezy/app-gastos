<template>
  <Transition name="slide-up">
    <div
      v-if="needRefresh"
      role="alert"
      aria-live="polite"
      class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md rounded-xl bg-theme-card border border-theme-border shadow-xl shadow-black/30 p-4 flex items-center gap-3"
    >
      <div class="text-2xl" aria-hidden="true">✨</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-theme-text">Nueva versión disponible</p>
        <p class="text-xs text-theme-text-sec">Recarga para obtener las últimas mejoras.</p>
      </div>
      <button
        type="button"
        class="min-h-[40px] h-10 px-3 rounded-lg bg-theme-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        :disabled="updating"
        aria-label="Recargar la aplicación con la nueva versión"
        @click="applyUpdate"
      >
        {{ updating ? 'Actualizando…' : 'Recargar' }}
      </button>
      <button
        type="button"
        class="tap-target h-9 w-9 flex items-center justify-center rounded-full text-theme-text-sec hover:text-theme-text transition-colors"
        aria-label="Cerrar aviso"
        @click="dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { usePwaUpdate } from '~/composables/usePwaUpdate'

const { needRefresh, updating, init, applyUpdate, dismiss } = usePwaUpdate()

onMounted(() => {
  init()
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 240ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 200ms ease-out;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}
</style>
