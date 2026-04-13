<template>
  <div class="bg-theme-card rounded-xl border border-theme-border overflow-hidden">
    <div class="px-3 py-2.5">
      <!-- Title row: concept spans full width -->
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '15' }"
        >
          <span class="text-xs">{{ resolveIcono(gasto.categoriaIcono) }}</span>
        </div>
        <p class="text-sm font-medium text-theme-text flex-1 min-w-0 break-words">{{ gasto.concepto }}</p>
        <span v-if="badgeLabel"
          class="text-[9px] bg-theme-accent-bg text-theme-accent px-1.5 py-0.5 rounded-full shrink-0"
        >{{ badgeLabel }}</span>
      </div>
      <!-- Details row: category, time, amount -->
      <div class="flex items-center justify-between ml-9">
        <div class="flex items-center gap-2">
          <span class="text-xs px-1.5 py-0.5 rounded-md"
            :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '15', color: gasto.categoriaColor || '#6b7280' }"
          >
            {{ gasto.categoriaNombre || 'Otros' }}
          </span>
          <span class="text-xs text-theme-text-muted">{{ formatHora(gasto.hora) }}</span>
        </div>
        <p class="text-sm font-semibold text-theme-text shrink-0">{{ currencySymbol }} {{ formatMonto(gasto.monto) }}</p>
      </div>
    </div>

    <!-- Action buttons — always visible as compact icons -->
    <div class="flex items-center gap-1 shrink-0 ml-2">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent-bg active:bg-theme-accent-bg transition-colors"
        aria-label="Editar"
        @click.stop="$emit('edit')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
        aria-label="Eliminar"
        @click.stop="onDelete"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { getMetodoRegistroBadgeLabel } from '~/utils/metodoRegistro'

const props = defineProps({
  gasto: { type: Object, required: true },
})

const emit = defineEmits(['edit', 'delete'])

const { vibrate } = useHaptic()

function onDelete() {
  vibrate([10, 30, 10])
  emit('delete')
}

const badgeLabel = computed(() => getMetodoRegistroBadgeLabel(props.gasto))

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
