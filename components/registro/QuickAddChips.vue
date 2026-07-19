<template>
  <div v-if="chips.length > 0" class="overflow-x-auto scrollbar-hide scroll-fade-r pr-8">
    <div class="flex items-center gap-1.5 min-w-max">
      <span
        class="text-[0.6875rem] uppercase tracking-wider text-theme-text-muted font-semibold pr-1"
        >Rápido</span
      >
      <div
        v-for="chip in chips"
        :key="chip.key"
        class="relative flex items-center gap-1.5 pl-2 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-theme-card border text-theme-text transition-all cursor-pointer"
        :class="
          editMode
            ? 'border-red-300 dark:border-red-500/40 animate-wiggle pr-2'
            : 'border-theme-border hover:border-theme-accent active:scale-95 pr-2.5'
        "
        @click="editMode ? $emit('remove', chip.key) : $emit('add', chip)"
        @touchstart.passive="onTouchStart(chip.key)"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchEnd"
      >
        <span class="text-sm leading-none">{{ chip.icono || '⚡' }}</span>
        <span class="truncate max-w-[110px]">{{ chip.concepto }}</span>
        <span v-if="!editMode" class="text-theme-accent font-semibold"
          >{{ currencySymbol }}{{ formatMonto(chip.monto) }}</span
        >
        <span
          v-else
          class="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[0.6875rem] leading-none ml-0.5"
          >✕</span
        >
      </div>

      <!-- Botón para salir del modo edición -->
      <button
        v-if="editMode"
        class="flex items-center gap-1 pl-2 pr-2.5 py-1.5 rounded-full text-[0.6875rem] font-semibold whitespace-nowrap bg-theme-accent/10 text-theme-accent border border-theme-accent/30"
        @click="editMode = false"
      >
        Listo
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  favoritos: { type: Array, default: () => [] },
  categorias: { type: Array, default: () => [] },
})
const emit = defineEmits(['add', 'remove'])

const { currencySymbol, formatMonto } = useCurrency()

const editMode = ref(false)
let longPressTimer = null

function onTouchStart(key) {
  longPressTimer = setTimeout(() => {
    editMode.value = true
  }, 500)
}

function onTouchEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const chips = computed(() => {
  return props.favoritos.map((f) => {
    const cat = props.categorias.find((c) => c.id === f.categoriaId)
    return {
      ...f,
      icono: cat?.icono || '⚡',
      categoriaNombre: cat?.nombre || 'Otros',
      categoriaColor: cat?.color || '#6b7280',
      categoriaIcono: cat?.icono || null,
    }
  })
})

// Salir del modo edición si se eliminan todos los chips
watch(
  () => props.favoritos.length,
  (len) => {
    if (len === 0) editMode.value = false
  },
)
</script>

<style scoped>
@keyframes wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-1.5deg);
  }
  75% {
    transform: rotate(1.5deg);
  }
}
.animate-wiggle {
  animation: wiggle 0.3s ease-in-out infinite;
}
</style>
