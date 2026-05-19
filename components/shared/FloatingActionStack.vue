<template>
  <div
    v-if="visible"
    class="fixed z-40 flex flex-col gap-3 items-center"
    :class="positionClass"
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
})

const positionClass = computed(() => ({
  'bottom-right': 'right-4 bottom-24 lg:right-8 lg:bottom-8',
  'bottom-left': 'left-4 bottom-24 lg:left-8 lg:bottom-8',
}[props.position]))
</script>
