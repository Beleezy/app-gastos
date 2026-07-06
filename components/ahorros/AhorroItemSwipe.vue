<template>
  <div
    class="swipe-wrapper relative overflow-hidden rounded-xl"
    :class="ahorro.pendiente ? 'opacity-60 animate-pulse pointer-events-none' : ''"
  >
    <!-- Acción revelada al swipe-derecha: Editar -->
    <div
      class="swipe-action swipe-action-left absolute inset-y-0 left-0 flex items-center pl-4"
      :class="swipeOffset > 20 ? 'opacity-100' : 'opacity-0'"
    >
      <div class="flex items-center gap-2 text-theme-accent">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span class="text-xs font-semibold">Editar</span>
      </div>
    </div>

    <!-- Acción revelada al swipe-izquierda: Eliminar -->
    <div
      class="swipe-action swipe-action-right absolute inset-y-0 right-0 flex items-center pr-4"
      :class="swipeOffset < -20 ? 'opacity-100' : 'opacity-0'"
    >
      <div class="flex items-center gap-2 text-red-400">
        <span class="text-xs font-semibold">Eliminar</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
    </div>

    <!-- Contenido principal -->
    <div
      class="group relative bg-theme-card border border-theme-border hover:border-theme-accent/30 transition-colors rounded-xl p-3"
      :style="{ transform: `translateX(${swipeOffset}px)`, transition: isDragging ? 'none' : 'transform 0.25s ease' }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          :style="{ backgroundColor: (ahorro.medioColor || '#6b7280') + '26' }"
        >
          <span class="text-base">{{ ahorro.medioIcono || '💰' }}</span>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-theme-text line-clamp-2 break-words leading-snug">
            {{ ahorro.concepto || ahorro.medioNombre || 'Ahorro' }}
          </p>
          <p class="text-[0.6875rem] text-theme-text-sec">
            {{ ahorro.medioNombre || 'Sin medio' }} · {{ formatFecha(ahorro.fecha) }}
          </p>
        </div>

        <div class="text-right shrink-0">
          <p class="text-sm font-bold text-emerald-400">+{{ currencySymbol }}&nbsp;{{ formatMonto(ahorro.monto) }}</p>
          <div v-if="ahorro.gastoPlanificadoId" class="text-[0.6875rem] text-theme-accent mt-0.5">vinculado</div>
        </div>
      </div>

      <!-- Botones inline para desktop hover / accesibilidad -->
      <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-theme-border/50 opacity-0 group-hover:opacity-100 transition-opacity max-sm:hidden">
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-theme-input text-theme-text-sec hover:text-theme-accent text-[0.6875rem] transition-colors"
          @click.stop="onEdit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-theme-input text-theme-text-sec hover:text-red-400 text-[0.6875rem] transition-colors"
          @click.stop="onDelete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Eliminar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  ahorro: { type: Object, required: true },
})
const emit = defineEmits(['edit', 'delete'])

const { currencySymbol, formatMonto } = useCurrency()
const { vibrate } = useHaptic()

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(`${fecha}T00:00:00`)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function onEdit() {
  if (props.ahorro.pendiente) return
  emit('edit', props.ahorro)
}
function onDelete() {
  if (props.ahorro.pendiente) return
  vibrate([10, 30, 10])
  emit('delete', props.ahorro)
}

const SWIPE_THRESHOLD = 70
const MAX_SWIPE = 110
const swipeOffset = ref(0)
const isDragging = ref(false)
let startX = 0
let startY = 0
let blockSwipe = false

function onTouchStart(e) {
  if (props.ahorro.pendiente) return
  const t = e.touches[0]
  startX = t.clientX
  startY = t.clientY
  isDragging.value = true
  blockSwipe = false
}

function onTouchMove(e) {
  if (!isDragging.value || blockSwipe) return
  const t = e.touches[0]
  const dx = t.clientX - startX
  const dy = t.clientY - startY
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
    blockSwipe = true
    swipeOffset.value = 0
    return
  }
  const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, dx))
  swipeOffset.value = clamped
}

function onTouchEnd() {
  if (!isDragging.value) {
    swipeOffset.value = 0
    return
  }
  isDragging.value = false
  const offset = swipeOffset.value
  swipeOffset.value = 0
  if (blockSwipe) return

  if (offset <= -SWIPE_THRESHOLD) {
    onDelete()
  } else if (offset >= SWIPE_THRESHOLD) {
    onEdit()
  }
}
</script>

<style scoped>
.swipe-wrapper {
  touch-action: pan-y;
}
.swipe-action {
  transition: opacity 0.2s ease;
}
.swipe-action-left {
  background: linear-gradient(to right, rgba(99, 102, 241, 0.15), transparent);
}
.swipe-action-right {
  background: linear-gradient(to left, rgba(239, 68, 68, 0.15), transparent);
}
</style>
