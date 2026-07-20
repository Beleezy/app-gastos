<template>
  <div
    v-if="visible"
    class="fixed z-40 flex flex-col gap-3 items-center transition-all duration-300"
    :class="[positionClass, scrollHidden ? 'translate-y-24 opacity-0 pointer-events-none' : '']"
  >
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: true },
  position: {
    type: String,
    default: 'bottom-right',
    validator: (v) => ['bottom-right', 'bottom-left'].includes(v),
  },
  // Auto-ocultar al hacer scroll hacia abajo (patrón Material) para no tapar
  // contenido en listas largas; reaparece al subir o al llegar al tope.
  autoHide: { type: Boolean, default: true },
})

const positionClass = computed(
  () =>
    ({
      'bottom-right': 'right-4 bottom-24 lg:right-8 lg:bottom-8',
      'bottom-left': 'left-4 bottom-24 lg:left-8 lg:bottom-8',
    })[props.position],
)

const scrollHidden = ref(false)
let lastY = 0

function onScroll() {
  if (!props.autoHide) return
  const y = window.scrollY
  if (Math.abs(y - lastY) < 8) return
  scrollHidden.value = y > lastY && y > 120
  lastY = y
}

onMounted(() => {
  lastY = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>
