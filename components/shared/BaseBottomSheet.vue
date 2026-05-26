<template>
  <div class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6">
    <div
      class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm"
      aria-hidden="true"
      data-testid="bottom-sheet-overlay"
      @click="$emit('close')"
    ></div>

    <div
      ref="sheetRef"
      role="dialog"
      aria-modal="true"
      data-testid="bottom-sheet"
      :aria-labelledby="titleId"
      class="relative flex w-full max-w-lg md:max-w-2xl lg:max-w-3xl flex-col overflow-hidden rounded-t-3xl md:rounded-3xl border-t md:border border-theme-border bg-theme-card animate-slide-up md:animate-dialog-in md:shadow-2xl md:shadow-black/40"
      style="max-height: 90dvh;"
      :style="sheetStyle"
      @keydown="onKeydown"
      @touchstart="onSheetTouchStart"
      @touchmove="onSheetTouchMove"
      @touchend="onSheetTouchEnd"
      @touchcancel="onSheetTouchEnd"
    >
      <div
        class="flex justify-center pt-3 pb-1 select-none md:hidden"
      >
        <div class="w-10 h-1 rounded-full bg-theme-border-md" aria-hidden="true"></div>
      </div>

      <div class="flex shrink-0 items-center justify-between px-5 md:px-6 pt-1 md:pt-5 pb-4">
        <h2 :id="titleId" class="min-w-0 flex-1 truncate pr-3 text-lg md:text-xl font-semibold text-theme-text">{{ title }}</h2>
        <button
          class="tap-target flex h-9 w-9 items-center justify-center rounded-full bg-theme-border-md text-theme-text-sec hover:text-theme-text transition-colors"
          aria-label="Cerrar"
          data-testid="btn-cerrar-bottom-sheet"
          @click="$emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        ref="scrollRef"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-6 space-y-4"
        :class="$slots.footer ? 'pb-4' : 'pb-8 md:pb-6'"
      >
        <slot />
      </div>

      <div
        v-if="$slots.footer"
        class="shrink-0 sheet-footer-sticky"
      >
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style>
@media (min-width: 768px) {
  @keyframes dialog-in {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .md\:animate-dialog-in {
    animation: dialog-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}
</style>

<script setup>
import { useModalBack } from '~/composables/useModalBack'
import { useModalLayer } from '~/composables/useModalLayer'

defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])

const sheetRef = ref(null)
const scrollRef = ref(null)
const dragOffset = ref(0)
const isDragging = ref(false)
const titleId = `bs-title-${Math.random().toString(36).slice(2, 9)}`

const { registerModal, unregisterModal } = useModalLayer()
const focusTrap = useFocusTrap(sheetRef, { onEscape: () => emit('close') })
const onKeydown = focusTrap.onKeydown

let touchStartY = 0
let dragStartY = 0
let dragStartedAt = 0
let draggingSheet = false
let decidedAction = false // 'drag' | 'scroll' | false

const CLOSE_DRAG_THRESHOLD = 96
const CLOSE_VELOCITY_THRESHOLD = 0.6
const MAX_DRAG_OFFSET = 320
const DRAG_DECISION_THRESHOLD = 8

const sheetStyle = computed(() => ({
  transform: dragOffset.value > 0 ? `translateY(${dragOffset.value}px)` : 'translateY(0px)',
  transition: isDragging.value ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
}))

function isInputElement(el) {
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

function onSheetTouchStart(event) {
  if (event.touches.length !== 1) return
  if (isInputElement(event.target)) return

  touchStartY = event.touches[0].clientY
  dragStartY = touchStartY
  dragStartedAt = performance.now()
  draggingSheet = false
  decidedAction = false
}

function onSheetTouchMove(event) {
  if (event.touches.length !== 1) return

  const currentY = event.touches[0].clientY
  const deltaFromStart = currentY - touchStartY
  const scrollEl = scrollRef.value

  // Decide si es drag del sheet o scroll del contenido
  if (!decidedAction) {
    if (Math.abs(deltaFromStart) < DRAG_DECISION_THRESHOLD) return

    const isScrollArea = scrollEl && scrollEl.contains(event.target)
    const scrollTop = scrollEl ? scrollEl.scrollTop : 0
    const isAtTop = scrollTop <= 0
    const isDownward = deltaFromStart > 0

    // Arrastrar el sheet si:
    // - No estamos en el área scrollable, o
    // - Estamos en el área scrollable pero el scroll está arriba y se arrastra hacia abajo
    if (!isScrollArea || (isAtTop && isDownward)) {
      decidedAction = 'drag'
      draggingSheet = true
      isDragging.value = true
      dragStartY = currentY
      dragStartedAt = performance.now()
    } else {
      decidedAction = 'scroll'
      return
    }
  }

  if (decidedAction === 'scroll') {
    // Durante el scroll, si llegamos al tope y seguimos arrastrando abajo, transicionar a drag
    if (scrollEl && scrollEl.scrollTop <= 0 && (currentY - touchStartY) > 0) {
      decidedAction = 'drag'
      draggingSheet = true
      isDragging.value = true
      dragStartY = currentY
      dragStartedAt = performance.now()
    }
    return
  }

  // Modo drag del sheet
  if (!draggingSheet) return

  const dragDelta = currentY - dragStartY

  if (dragDelta <= 0) {
    dragOffset.value = 0
    return
  }

  event.preventDefault()
  dragOffset.value = Math.min(dragDelta, MAX_DRAG_OFFSET)
}

function onSheetTouchEnd() {
  if (!draggingSheet) {
    decidedAction = false
    return
  }

  const elapsed = Math.max(performance.now() - dragStartedAt, 1)
  const velocity = dragOffset.value / elapsed

  isDragging.value = false
  draggingSheet = false
  decidedAction = false

  if (dragOffset.value >= CLOSE_DRAG_THRESHOLD || velocity >= CLOSE_VELOCITY_THRESHOLD) {
    emit('close')
    return
  }

  dragOffset.value = 0
}

useModalBack(() => emit('close'))

onMounted(() => {
  registerModal()
  focusTrap.activate()
})

onUnmounted(() => {
  unregisterModal()
  focusTrap.deactivate()
})
</script>
