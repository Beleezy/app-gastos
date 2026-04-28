<template>
  <Transition name="badge">
    <div
      v-if="totalPending > 0"
      role="status"
      aria-live="polite"
      class="fixed left-1/2 -translate-x-1/2 z-30 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium shadow-lg backdrop-blur-md"
      :style="{ bottom: `calc(${bottomOffset} + env(safe-area-inset-bottom, 0px))` }"
    >
      <svg
        v-if="isFlushing"
        xmlns="http://www.w3.org/2000/svg"
        class="w-3.5 h-3.5 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7M3 7h.01" />
      </svg>
      <span>
        {{ totalPending }} pendiente{{ totalPending === 1 ? '' : 's' }} de sincronizar
      </span>
      <button
        v-if="!isFlushing"
        type="button"
        class="ml-1 underline decoration-dotted underline-offset-2 hover:opacity-80"
        aria-label="Sincronizar ahora"
        @click="onFlush"
      >
        sincronizar
      </button>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  bottomOffset: {
    type: String,
    default: '5rem',
  },
})

const { pending, isFlushing, flush } = useSyncQueue()
const { apiFetch } = useApiFetch()

const totalPending = computed(() => (pending.value || []).length)

function onFlush() {
  flush(apiFetch).catch(() => {})
}
</script>

<style scoped>
.badge-enter-active,
.badge-leave-active {
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 200ms ease-out;
}
.badge-enter-from,
.badge-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
