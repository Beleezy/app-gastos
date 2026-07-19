<template>
  <div class="px-4 lg:px-0 space-y-2">
    <SharedEmptyState
      v-if="porMedioFiltrado.length === 0"
      icon="💰"
      title="Sin ahorros que coincidan"
      compact
    />

    <div
      v-for="item in porMedioFiltrado"
      :key="item.medioAhorroId ?? 0"
      class="rounded-xl bg-theme-card border border-theme-border overflow-hidden"
      :class="expandidos.has(keyOf(item)) ? 'border-theme-accent' : ''"
    >
      <button
        class="w-full flex items-center gap-3 p-3 hover:bg-theme-input/50 transition-colors text-left"
        @click="toggle(item)"
      >
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          :style="{ backgroundColor: (item.medioColor || '#6b7280') + '26' }"
        >
          <span class="text-sm">{{ item.medioIcono || '💰' }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <span
              class="text-sm font-medium text-theme-text line-clamp-2 break-words leading-snug min-w-0"
              >{{ item.medioNombre || 'Sin medio' }}</span
            >
            <span class="text-sm font-bold text-emerald-400 whitespace-nowrap shrink-0"
              >+{{ currencySymbol }}&nbsp;{{ formatMonto(item.total) }}</span
            >
          </div>
          <div class="mt-1.5 relative w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              :style="{
                width: porcentaje(item.total) + '%',
                backgroundColor: item.medioColor || '#6b7280',
              }"
            ></div>
          </div>
          <p class="text-[0.6875rem] text-theme-text-muted mt-1">
            {{ item.registros.length }} registro{{ item.registros.length !== 1 ? 's' : '' }} ·
            {{ porcentaje(item.total).toFixed(0) }}%
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-theme-text-muted transition-transform duration-200 shrink-0"
          :class="expandidos.has(keyOf(item)) ? 'rotate-180' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Transition name="expand">
        <div
          v-if="expandidos.has(keyOf(item))"
          class="border-t border-theme-border px-2 py-2 space-y-1.5"
        >
          <AhorrosAhorroItemSwipe
            v-for="a in item.registros"
            :key="a.id"
            :ahorro="a"
            @edit="$emit('editar', $event)"
            @delete="$emit('eliminar', $event)"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  porMedioFiltrado: { type: Array, required: true },
  totalFiltrado: { type: Number, required: true },
})
defineEmits(['editar', 'eliminar'])

const { currencySymbol, formatMonto } = useCurrency()
const expandidos = ref(new Set())

function keyOf(item) {
  return item.medioAhorroId ?? 0
}
function porcentaje(monto) {
  return props.totalFiltrado > 0 ? (monto / props.totalFiltrado) * 100 : 0
}
function toggle(item) {
  const k = keyOf(item)
  if (expandidos.value.has(k)) expandidos.value.delete(k)
  else expandidos.value.add(k)
  expandidos.value = new Set(expandidos.value)
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 2000px;
  opacity: 1;
}
</style>
