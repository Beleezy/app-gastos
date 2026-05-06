<template>
  <div class="relative inline-block">
    <button
      type="button"
      class="min-h-[40px] h-10 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors"
      :class="loading
        ? 'bg-theme-border-md text-theme-text-muted cursor-wait'
        : 'bg-theme-border-md text-theme-text-sec hover:text-emerald-400'"
      :disabled="loading"
      :aria-label="abierto ? 'Cerrar opciones de exportación' : 'Abrir opciones de exportación'"
      :aria-expanded="abierto"
      :aria-haspopup="formats.length > 1"
      @click="onClick"
    >
      <svg
        v-if="loading"
        class="w-3.5 h-3.5 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {{ label || 'Exportar' }}
    </button>

    <Transition name="menu">
      <div
        v-if="abierto"
        ref="menuRef"
        role="menu"
        class="absolute right-0 top-11 z-30 min-w-[10rem] rounded-xl border border-theme-border bg-theme-card shadow-xl overflow-hidden"
      >
        <button
          v-for="f in formats"
          :key="f"
          type="button"
          role="menuitem"
          class="w-full text-left min-h-[44px] px-3 py-2 text-sm text-theme-text-sec hover:text-theme-text hover:bg-theme-border-md transition-colors"
          @click="seleccionar(f)"
        >
          {{ formatLabel(f) }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  formats: {
    type: Array,
    default: () => ['pdf', 'excel'],
    validator: (arr) => arr.every((f) => ['pdf', 'excel', 'csv', 'json', 'historial-pdf', 'whatsapp'].includes(f)),
  },
  label: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const abierto = ref(false)
const menuRef = ref(null)

function formatLabel(f) {
  return {
    pdf: 'PDF resumen',
    excel: 'Excel',
    csv: 'CSV',
    json: 'JSON',
    'historial-pdf': 'PDF historial completo',
    whatsapp: 'WhatsApp',
  }[f] || f.toUpperCase()
}

function onClick() {
  if (props.formats.length === 1) {
    emit('select', props.formats[0])
    return
  }
  abierto.value = !abierto.value
}

function seleccionar(format) {
  abierto.value = false
  emit('select', format)
}

function onClickFuera(e) {
  if (!abierto.value) return
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    abierto.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Escape' && abierto.value) {
    e.stopPropagation()
    abierto.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', onClickFuera, true)
    document.addEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onClickFuera, true)
    document.removeEventListener('keydown', onKeydown)
  }
})
</script>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition:
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 160ms ease-out;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
