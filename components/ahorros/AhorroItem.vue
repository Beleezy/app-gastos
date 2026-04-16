<template>
  <div class="flex items-center gap-3 rounded-xl bg-theme-card border border-theme-border p-3 group">
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      :style="{ backgroundColor: (ahorro.medioColor || '#6b7280') + '26' }"
    >
      <span class="text-base">{{ ahorro.medioIcono || '💰' }}</span>
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-theme-text truncate">
        {{ ahorro.concepto || ahorro.medioNombre || 'Ahorro' }}
      </p>
      <p class="text-[11px] text-theme-text-sec">
        {{ ahorro.medioNombre || 'Sin medio' }} · {{ formatFecha(ahorro.fecha) }}
      </p>
    </div>

    <div class="text-right shrink-0">
      <p class="text-sm font-bold text-emerald-400">+{{ currencySymbol }} {{ formatMonto(ahorro.monto) }}</p>
      <div v-if="ahorro.gastoPlanificadoId" class="text-[9px] text-theme-accent mt-0.5">vinculado</div>
    </div>

    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button
        class="w-7 h-7 flex items-center justify-center rounded-lg bg-theme-input text-theme-text-sec hover:text-theme-accent transition-colors"
        @click="$emit('editar', ahorro)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        class="w-7 h-7 flex items-center justify-center rounded-lg bg-theme-input text-theme-text-sec hover:text-red-400 transition-colors"
        @click="$emit('eliminar', ahorro)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  ahorro: { type: Object, required: true },
})
defineEmits(['editar', 'eliminar'])

const { currencySymbol, formatMonto } = useCurrency()

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(`${fecha}T00:00:00`)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}
</script>
