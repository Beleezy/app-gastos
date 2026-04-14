<template>
  <div class="group relative bg-theme-card rounded-xl border border-theme-border hover:border-theme-accent/30 transition-colors">
    <div class="flex items-stretch">
      <!-- Left: Category icon + colored accent bar -->
      <div class="flex items-center pl-2.5 pr-2 py-2.5">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
          :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '20' }"
        >
          <span class="text-base leading-none">{{ resolveIcono(gasto.categoriaIcono) }}</span>
        </div>
      </div>

      <!-- Center: Concepto + meta -->
      <div class="flex-1 min-w-0 py-2.5 pr-2">
        <div class="flex items-start gap-1.5">
          <p class="text-sm font-medium text-theme-text flex-1 min-w-0 break-words leading-tight">{{ gasto.concepto }}</p>
          <span v-if="badgeLabel"
            class="text-[9px] bg-theme-accent-bg text-theme-accent px-1.5 py-0.5 rounded-full shrink-0 leading-none"
          >{{ badgeLabel }}</span>
        </div>
        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
          <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-md leading-none"
            :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '18', color: gasto.categoriaColor || '#6b7280' }"
          >
            {{ gasto.categoriaNombre || 'Otros' }}
          </span>
          <span class="text-[10px] text-theme-text-muted flex items-center gap-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ formatHora(gasto.hora) }}
          </span>
          <span v-if="gasto.notas" class="text-[10px] text-theme-text-muted truncate max-w-[120px]" :title="gasto.notas">
            · {{ gasto.notas }}
          </span>
        </div>
      </div>

      <!-- Right: Amount + actions -->
      <div class="flex flex-col items-end justify-between py-2.5 pr-2.5 pl-1 shrink-0">
        <p class="text-sm font-bold text-theme-text leading-none whitespace-nowrap">
          {{ currencySymbol }} {{ formatMonto(gasto.monto) }}
        </p>
        <div class="flex items-center gap-0.5 mt-1.5">
          <button
            class="w-6 h-6 flex items-center justify-center rounded-md text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent-bg active:scale-90 transition-all"
            aria-label="Editar"
            @click.stop="$emit('edit')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            class="w-6 h-6 flex items-center justify-center rounded-md text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
            aria-label="Eliminar"
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
