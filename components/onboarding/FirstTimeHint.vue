<template>
  <Transition name="hint">
    <div
      v-if="mostrar"
      role="status"
      aria-live="polite"
      :class="['absolute z-30 pointer-events-auto', positionClass]"
    >
      <div
        class="relative bg-theme-accent text-theme-on-accent text-[0.6875rem] font-medium rounded-xl px-3 py-2 shadow-lg max-w-[220px] leading-snug"
      >
        <!-- Flecha -->
        <div
          class="absolute w-2 h-2 bg-theme-accent rotate-45"
          :class="arrowClass"
        ></div>
        <div class="flex items-start gap-2">
          <span class="shrink-0 text-base leading-none">{{ icono }}</span>
          <div class="flex-1">
            <slot>{{ mensaje }}</slot>
          </div>
          <button
            type="button"
            aria-label="Cerrar pista"
            class="shrink-0 -mt-0.5 -mr-1 text-theme-on-accent/80 hover:text-theme-on-accent transition-colors"
            @click="dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  /** Clave única del hint para no mostrarlo dos veces (persistencia en localStorage). */
  hintKey: { type: String, required: true },
  /** Mensaje a mostrar; ignorado si se usa slot default. */
  mensaje: { type: String, default: '' },
  icono: { type: String, default: '💡' },
  /** Posición relativa al contenedor padre (que debe ser position:relative). */
  position: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'bottom', 'left', 'right'].includes(v),
  },
  /** Ocultar automáticamente tras X ms. 0 = nunca. */
  autoDismiss: { type: Number, default: 8000 },
  /** Espera N ms tras montar antes de mostrar. */
  delay: { type: Number, default: 500 },
})

const { hintVisto, marcarHintVisto } = useOnboarding()

const mostrar = ref(false)
let dismissTimer = null

onMounted(() => {
  if (hintVisto(props.hintKey)) return
  setTimeout(() => {
    mostrar.value = true
    if (props.autoDismiss > 0) {
      dismissTimer = setTimeout(dismiss, props.autoDismiss)
    }
  }, props.delay)
})

onBeforeUnmount(() => {
  if (dismissTimer) clearTimeout(dismissTimer)
})

function dismiss() {
  mostrar.value = false
  marcarHintVisto(props.hintKey)
  if (dismissTimer) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

const positionClass = computed(() => ({
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2',
}[props.position]))

const arrowClass = computed(() => ({
  top: 'left-1/2 -translate-x-1/2 -bottom-1',
  bottom: 'left-1/2 -translate-x-1/2 -top-1',
  left: 'top-1/2 -translate-y-1/2 -right-1',
  right: 'top-1/2 -translate-y-1/2 -left-1',
}[props.position]))
</script>

<style scoped>
.hint-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.hint-leave-active {
  transition: all 0.2s ease-out;
}
.hint-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(4px);
}
.hint-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
