<template>
  <div
    class="swipe-wrapper relative overflow-hidden rounded-xl"
    :class="[
      gasto.pendiente ? 'opacity-60 animate-pulse pointer-events-none' : '',
      selectable && selected ? 'ring-2 ring-theme-accent' : '',
    ]"
    @click="onWrapperClick"
    @contextmenu.prevent="onLongPress"
  >
    <!-- Acción revelada al swipe-derecha: Editar -->
    <div class="swipe-action swipe-action-left absolute inset-y-0 left-0 flex items-center pl-4"
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
    <div class="swipe-action swipe-action-right absolute inset-y-0 right-0 flex items-center pr-4"
      :class="swipeOffset < -20 ? 'opacity-100' : 'opacity-0'"
    >
      <div class="flex items-center gap-2 text-red-400">
        <span class="text-xs font-semibold">Eliminar</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
    </div>

    <!-- Contenido principal (con transform) -->
    <div
      class="group relative bg-theme-card border border-theme-border hover:border-theme-accent/30 transition-colors rounded-xl flex items-stretch"
      :style="{ transform: `translateX(${swipeOffset}px)`, transition: isDragging ? 'none' : 'transform 0.25s ease' }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Checkbox de selección -->
      <div v-if="selectable" class="flex items-center pl-3 pr-0 shrink-0">
        <div
          class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
          :class="selected ? 'bg-theme-accent border-theme-accent' : 'border-theme-border-md bg-theme-card'"
        >
          <svg v-if="selected" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-theme-on-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div class="flex items-stretch flex-1 min-w-0">
        <div class="flex items-center pl-2.5 pr-2 py-2.5">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
            :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '20' }"
          >
            <span class="text-base leading-none">{{ resolveIcono(gasto.categoriaIcono) }}</span>
          </div>
        </div>

        <div class="flex-1 min-w-0 py-2.5 pr-2.5">
          <!-- Fila 1: concepto + monto arriba a la derecha. El monto NO va
               debajo (se veía raro) y con conceptos cortos la fila queda
               compacta; con largos, el texto envuelve bajo el monto sin
               aplastarse porque la derecha solo ocupa el ancho del monto. -->
          <div class="flex items-start justify-between gap-2">
            <p class="min-w-0 flex-1 text-sm font-medium text-theme-text break-words leading-tight" data-testid="gasto-concepto">{{ gasto.concepto }}</p>
            <p class="shrink-0 text-sm font-bold text-theme-text leading-tight whitespace-nowrap" data-testid="gasto-monto">
              {{ currencySymbol }}&nbsp;{{ formatMonto(gasto.monto) }}
            </p>
          </div>
          <p v-if="gasto.notas" class="mt-1 text-[11px] text-theme-text-muted break-words leading-snug">
            {{ gasto.notas }}
          </p>
          <!-- Fila 2: meta a la izquierda, acciones a la derecha -->
          <div class="flex items-center gap-1.5 mt-1">
            <div class="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
              <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-md leading-none"
                :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '18', color: gasto.categoriaColor || '#6b7280' }"
                data-testid="gasto-categoria"
              >
                {{ gasto.categoriaNombre || 'Otros' }}
              </span>
              <span class="text-[10px] text-theme-text-muted flex items-center gap-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatHora(gasto.hora) }}
              </span>
              <span v-if="badgeLabel" class="text-[9px] bg-theme-accent-bg text-theme-accent px-1.5 py-0.5 rounded-full leading-none">{{ badgeLabel }}</span>
            </div>
            <div v-if="!selectable" class="flex items-center gap-0.5 shrink-0">
              <button
                class="w-7 h-7 flex items-center justify-center rounded-md text-theme-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-90 transition-all"
                aria-label="Duplicar"
                @click.stop="onDuplicate"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                class="w-7 h-7 flex items-center justify-center rounded-md text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent-bg active:scale-90 transition-all"
                aria-label="Editar"
                data-testid="btn-editar-gasto"
                @click.stop="onEdit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                class="w-7 h-7 flex items-center justify-center rounded-md text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                aria-label="Eliminar"
                data-testid="btn-eliminar-gasto"
                @click.stop="onDelete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getMetodoRegistroBadgeLabel } from '~/utils/metodoRegistro'

const props = defineProps({
  gasto: { type: Object, required: true },
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'delete', 'duplicate', 'toggle-select', 'long-press'])

const { vibrate } = useHaptic()

function onDelete() {
  if (props.gasto.pendiente) return
  vibrate([10, 30, 10])
  emit('delete')
}

function onEdit() {
  if (props.gasto.pendiente) return
  emit('edit')
}

function onDuplicate() {
  if (props.gasto.pendiente) return
  vibrate([10, 30, 10])
  emit('duplicate')
}

function onWrapperClick(e) {
  if (props.gasto.pendiente) return
  if (!props.selectable) return
  // En modo selección, el wrapper intercepta el click (los botones internos tienen .stop)
  vibrate(8)
  emit('toggle-select')
}

function onLongPress() {
  if (props.gasto.pendiente) return
  if (props.selectable) return
  emit('long-press')
}

// Long-press por touch para activar modo selección
let longPressTimer = null
let longPressStart = { x: 0, y: 0 }
function startLongPressTouch(e) {
  if (props.gasto.pendiente || props.selectable) return
  const t = e.touches?.[0]
  if (!t) return
  longPressStart = { x: t.clientX, y: t.clientY }
  clearTimeout(longPressTimer)
  longPressTimer = setTimeout(() => {
    vibrate([20, 40, 20])
    emit('long-press')
  }, 450)
}
function moveLongPressTouch(e) {
  if (!longPressTimer) return
  const t = e.touches?.[0]
  if (!t) return
  const dx = Math.abs(t.clientX - longPressStart.x)
  const dy = Math.abs(t.clientY - longPressStart.y)
  if (dx > 10 || dy > 10) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}
function endLongPressTouch() {
  clearTimeout(longPressTimer)
  longPressTimer = null
}

const badgeLabel = computed(() => getMetodoRegistroBadgeLabel(props.gasto))

// ─── Swipe actions ──────────────────────────────────────
const SWIPE_THRESHOLD = 70
const MAX_SWIPE = 110
const swipeOffset = ref(0)
const isDragging = ref(false)
let startX = 0
let startY = 0
let blockSwipe = false

function onTouchStart(e) {
  if (props.gasto.pendiente) return
  const t = e.touches[0]
  startX = t.clientX
  startY = t.clientY
  isDragging.value = true
  blockSwipe = false
  startLongPressTouch(e)
}

function onTouchMove(e) {
  moveLongPressTouch(e)
  if (!isDragging.value || blockSwipe) return
  if (props.selectable) return
  const t = e.touches[0]
  const dx = t.clientX - startX
  const dy = t.clientY - startY
  // Si el movimiento es más vertical que horizontal, bloquear swipe (permite scroll)
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
    blockSwipe = true
    swipeOffset.value = 0
    return
  }
  // Clamp
  const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, dx))
  swipeOffset.value = clamped
}

function onTouchEnd() {
  endLongPressTouch()
  if (!isDragging.value) {
    swipeOffset.value = 0
    return
  }
  isDragging.value = false
  const offset = swipeOffset.value
  swipeOffset.value = 0
  if (blockSwipe || props.selectable) return

  if (offset <= -SWIPE_THRESHOLD) {
    onDelete()
  } else if (offset >= SWIPE_THRESHOLD) {
    onEdit()
  }
}

const ICON_MAP = {
  'utensils': '🍽️', 'bus': '🚌', 'home': '🏠', 'heart-pulse': '🏥',
  'graduation-cap': '📚', 'gamepad': '🎮', 'shirt': '👕', 'zap': '⚡',
  'piggy-bank': '💰', 'credit-card': '💳', 'circle-dot': '📦',
}

function resolveIcono(icono) {
  if (!icono) return '📦'
  if (icono.charCodeAt(0) > 255) return icono
  return ICON_MAP[icono] || '📦'
}

function formatHora(hora) {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}

const { currencySymbol, formatMonto } = useCurrency()
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
