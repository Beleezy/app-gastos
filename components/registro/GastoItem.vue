<template>
  <div class="bg-primary-800/60 rounded-xl border border-primary-700/30 overflow-hidden group">
    <div class="flex items-center gap-3 px-3 py-2.5">
      <!-- Category icon -->
      <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '15' }"
      >
        <span class="text-sm">{{ resolveIcono(gasto.categoriaIcono) }}</span>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="text-sm font-medium text-white truncate">{{ gasto.concepto }}</p>
          <span v-if="gasto.metodoRegistro === 'voz'"
            class="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full shrink-0"
          >VOZ</span>
        </div>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-xs px-1.5 py-0.5 rounded-md"
            :style="{ backgroundColor: (gasto.categoriaColor || '#6b7280') + '15', color: gasto.categoriaColor || '#6b7280' }"
          >
            {{ gasto.categoriaNombre || 'Otros' }}
          </span>
          <span class="text-xs text-gray-600">{{ formatHora(gasto.hora) }}</span>
        </div>
      </div>

      <!-- Amount -->
      <div class="text-right shrink-0">
        <p class="text-sm font-semibold text-white">{{ currencySymbol }} {{ formatMonto(gasto.monto) }}</p>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex border-t border-primary-700/20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity h-0 group-hover:h-auto overflow-hidden">
      <button
        class="flex-1 py-2 text-xs text-gray-500 hover:text-blue-400 hover:bg-primary-700/20 transition-colors flex items-center justify-center gap-1"
        @click="$emit('edit')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Editar
      </button>
      <button
        class="flex-1 py-2 text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors flex items-center justify-center gap-1 border-l border-primary-700/20"
        @click="$emit('delete')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Eliminar
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  gasto: { type: Object, required: true },
})

defineEmits(['edit', 'delete'])

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
