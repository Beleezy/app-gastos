<template>
  <div class="overflow-x-auto scrollbar-hide scroll-fade-r pr-8" data-testid="filtros-categoria">
    <div class="flex items-center gap-1.5 min-w-max">
      <button
        class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
        :class="
          !modelValue
            ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent'
            : 'bg-theme-card text-theme-text-sec border border-theme-border'
        "
        @click="$emit('update:modelValue', null)"
      >
        Todas
      </button>
      <button
        v-for="cat in categorias"
        :key="cat.id"
        :data-testid="`filtro-categoria-${cat.slug || cat.nombre.toLowerCase()}`"
        class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
        :class="
          modelValue === cat.id
            ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent'
            : 'bg-theme-card text-theme-text-sec border border-theme-border'
        "
        @click="$emit('update:modelValue', modelValue === cat.id ? null : cat.id)"
      >
        <span>{{ cat.icono || '📦' }}</span>
        <span>{{ cat.nombre }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  categorias: { type: Array, default: () => [] },
  modelValue: { type: String, default: null },
})
defineEmits(['update:modelValue'])
</script>
