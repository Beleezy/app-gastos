<template>
  <header class="flex items-center gap-3 mb-4">
    <span
      class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
      :class="tileClass"
    >{{ icon }}</span>
    <div class="min-w-0">
      <h1 class="text-[1.3rem] font-extrabold text-theme-text leading-tight truncate">{{ title }}</h1>
      <p class="text-[0.74rem] text-theme-text-sec leading-snug">{{ subtitle }}</p>
    </div>
  </header>
</template>

<script setup>
// Cabecera V3 unificada para todos los módulos de la vista previa.
const props = defineProps({
  icon: { type: String, default: '✨' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  accent: { type: String, default: 'accent' }, // accent | green | red | sky | amber | violet
})

const TILES = {
  accent: 'bg-theme-accent-bg',
  green: 'bg-emerald-500/15',
  red: 'bg-red-500/15',
  sky: 'bg-sky-500/15',
  amber: 'bg-amber-500/15',
  violet: 'bg-violet-500/15',
}
const tileClass = computed(() => TILES[props.accent] || TILES.accent)
</script>
