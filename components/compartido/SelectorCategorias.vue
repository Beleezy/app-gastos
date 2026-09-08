<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="text-sm font-medium text-theme-text-muted">Rubros que compartes</label>
      <button
        v-if="seleccionadas.length"
        type="button"
        class="text-xs text-theme-text-muted hover:text-theme-text"
        @click="limpiar"
      >
        Quitar todos
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="cat in categorias"
        :key="cat.id"
        type="button"
        class="tap-target px-3 py-2 rounded-xl text-xs font-medium border transition-colors"
        :class="
          estaSeleccionada(cat.id)
            ? 'bg-theme-accent-bg border-theme-accent text-theme-accent'
            : 'bg-theme-input border-theme-border text-theme-text-sec hover:border-theme-accent'
        "
        :aria-pressed="estaSeleccionada(cat.id)"
        @click="alternar(cat.id)"
      >
        <span aria-hidden="true">{{ cat.icono || '📊' }}</span> {{ cat.nombre }}
      </button>
    </div>

    <p class="text-[0.6875rem] text-theme-text-muted mt-2">
      {{
        seleccionadas.length
          ? 'Verá el total mensual de estos rubros y cómo van contra tu presupuesto.'
          : 'Sin rubros marcados solo verá los gastos que compartas uno por uno.'
      }}
    </p>

    <!-- Umbral por rubro: el observador decide cuándo quiere que le avise -->
    <div v-if="seleccionadas.length && mostrarUmbrales" class="mt-3 space-y-2">
      <p class="text-xs font-medium text-theme-text-sec">Avisar cuando llegue a…</p>
      <div
        v-for="sel in seleccionadas"
        :key="sel.categoriaId"
        class="flex items-center gap-3 py-1.5"
      >
        <span class="text-xs text-theme-text-sec flex-1 min-w-0 truncate">{{
          nombreDe(sel.categoriaId)
        }}</span>
        <input
          v-model.number="sel.umbralAviso"
          type="range"
          min="10"
          max="150"
          step="5"
          class="w-32 accent-theme-accent"
          :aria-label="`Umbral de aviso para ${nombreDe(sel.categoriaId)}`"
          @change="emitir"
        />
        <span class="text-xs font-semibold text-theme-text w-10 text-right"
          >{{ sel.umbralAviso }}%</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  categorias: { type: Array, default: () => [] },
  mostrarUmbrales: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const seleccionadas = ref(props.modelValue.map((c) => ({ ...c })))

watch(
  () => props.modelValue,
  (v) => {
    seleccionadas.value = (v || []).map((c) => ({ ...c }))
  },
)

function estaSeleccionada(id) {
  return seleccionadas.value.some((c) => c.categoriaId === id)
}

function alternar(id) {
  seleccionadas.value = estaSeleccionada(id)
    ? seleccionadas.value.filter((c) => c.categoriaId !== id)
    : [...seleccionadas.value, { categoriaId: id, umbralAviso: 75 }]
  emitir()
}

function limpiar() {
  seleccionadas.value = []
  emitir()
}

function nombreDe(id) {
  return props.categorias.find((c) => c.id === id)?.nombre || 'Rubro'
}

function emitir() {
  emit(
    'update:modelValue',
    seleccionadas.value.map((c) => ({ ...c })),
  )
}
</script>
