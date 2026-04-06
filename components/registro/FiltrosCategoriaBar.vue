<template>
  <div class="overflow-x-auto scrollbar-hide">
    <div class="flex items-center gap-1.5 min-w-max">
      <button
        class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
        :class="!modelValue ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
        @click="$emit('update:modelValue', null)"
      >
        Todas
      </button>
      <button
        v-for="cat in categorias"
        :key="cat.id"
        class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
        :class="modelValue === cat.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-primary-800/40 text-gray-500 border border-primary-700/20'"
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
