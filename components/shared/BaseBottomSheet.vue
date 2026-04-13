<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="$emit('close')"></div>

    <div
      ref="sheetRef"
      class="relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-theme-border bg-theme-card animate-slide-up"
      style="max-height: 90dvh;"
      :style="sheetStyle"
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <div
        class="flex justify-center pt-3 pb-1 select-none"
        @touchstart.stop="onHandleTouchStart"
        @touchmove.stop="onHandleTouchMove"
        @touchend.stop="onHandleTouchEnd"
        @touchcancel.stop="onHandleTouchEnd"
      >
        <div class="w-10 h-1 rounded-full bg-theme-border-md"></div>
      </div>

      <div class="flex shrink-0 items-center justify-between px-5 pb-4">
        <h2 class="text-lg font-semibold text-theme-text">{{ title }}</h2>
        <button class="flex h-8 w-8 items-center justify-center rounded-full bg-theme-border-md text-theme-text-sec" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        ref="scrollRef"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 space-y-4"
        @touchstart.stop="onScrollTouchStart"
        @touchmove.stop="onScrollTouchMove"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useModalBack } from '~/composables/useModalBack'
import { useModalLayer } from '~/composables/useModalLayer'

defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])

const sheetRef = ref(null)
const scrollRef = ref(null)
const dragOffset = ref(0)
const isDragging = ref(false)

const { registerModal, unregisterModal } = useModalLayer()

let scrollTouchStartY = 0
let dragStartY = 0
let dragStartedAt = 0

const CLOSE_DRAG_THRESHOLD = 96
const CLOSE_VELOCITY_THRESHOLD = 0.6
const MAX_DRAG_OFFSET = 320

const sheetStyle = computed(() => ({
  transform: dragOffset.value > 0 ? `translateY(${dragOffset.value}px)` : 'translateY(0px)',
  transition: isDragging.value ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
}))

function onScrollTouchStart(event) {
  scrollTouchStartY = event.touches[0].clientY
}

function onScrollTouchMove(event) {
  const scrollEl = scrollRef.value
  if (!scrollEl) return

  const deltaY = event.touches[0].clientY - scrollTouchStartY
  const canScroll = scrollEl.scrollHeight > scrollEl.clientHeight + 1
  const atTop = scrollEl.scrollTop <= 0
  const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1

  if (!canScroll || (atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
    event.preventDefault()
  }
}

function onHandleTouchStart(event) {
  if (event.touches.length !== 1) return

  isDragging.value = true
  dragStartY = event.touches[0].clientY
  dragStartedAt = performance.now()
}

function onHandleTouchMove(event) {
  if (!isDragging.value) return

  const deltaY = event.touches[0].clientY - dragStartY

  if (deltaY <= 0) {
    dragOffset.value = 0
    return
  }

  event.preventDefault()
  dragOffset.value = Math.min(deltaY, MAX_DRAG_OFFSET)
}

function onHandleTouchEnd() {
  if (!isDragging.value) return

  const elapsed = Math.max(performance.now() - dragStartedAt, 1)
  const velocity = dragOffset.value / elapsed

  isDragging.value = false

  if (dragOffset.value >= CLOSE_DRAG_THRESHOLD || velocity >= CLOSE_VELOCITY_THRESHOLD) {
    emit('close')
    return
  }

  dragOffset.value = 0
}

useModalBack(() => emit('close'))

onMounted(() => {
  registerModal()
})

onUnmounted(() => {
  unregisterModal()
})
</script>
