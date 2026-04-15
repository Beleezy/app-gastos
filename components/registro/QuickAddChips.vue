<template>
  <div v-if="chips.length > 0" class="overflow-x-auto scrollbar-hide">
    <div class="flex items-center gap-1.5 min-w-max">
      <span class="text-[10px] uppercase tracking-wider text-theme-text-muted font-semibold pr-1">Rápido</span>
      <button
        v-for="chip in chips"
        :key="chip.key"
        class="group flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent active:scale-95 transition-all"
        @click="$emit('add', chip)"
      >
        <span class="text-sm leading-none">{{ chip.icono || '⚡' }}</span>
        <span class="truncate max-w-[110px]">{{ chip.concepto }}</span>
        <span class="text-theme-accent font-semibold">{{ currencySymbol }}{{ formatMonto(chip.monto) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  favoritos: { type: Array, default: () => [] },
  categorias: { type: Array, default: () => [] },
})
defineEmits(['add'])

const { currencySymbol, formatMonto } = useCurrency()

const chips = computed(() => {
  return props.favoritos.map(f => {
    const cat = props.categorias.find(c => c.id === f.categoriaId)
    return {
      ...f,
      icono: cat?.icono || '⚡',
      categoriaNombre: cat?.nombre || 'Otros',
      categoriaColor: cat?.color || '#6b7280',
      categoriaIcono: cat?.icono || null,
    }
  })
})
</script>
