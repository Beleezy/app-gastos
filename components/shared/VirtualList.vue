<template>
  <!-- Render directo cuando la lista es pequeña: evita overhead de
       scroll/transform y mantiene transitions naturales. -->
  <div v-if="!shouldVirtualize" class="virtual-list-passthrough">
    <slot name="header" />
    <slot
      v-for="(item, idx) in source"
      :key="getKey(item, idx)"
      :item="item"
      :index="idx"
    />
    <slot name="footer" />
  </div>

  <!-- Modo virtual: solo monta items en el viewport ± overscan. -->
  <div
    v-else
    ref="containerEl"
    class="virtual-list-container"
    :style="{ height: maxHeight + 'px' }"
    @scroll.passive="onScroll"
  >
    <slot name="header" />
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div :style="{ transform: `translateY(${offsetY}px)`, willChange: 'transform' }">
        <slot
          v-for="entry in visibleItems"
          :key="entry.key"
          :item="entry.item"
          :index="entry.index"
        />
      </div>
    </div>
    <slot name="footer" />
  </div>
</template>

<script setup>
// Wrapper sobre useVirtualList. Activa la virtualización solo cuando la
// lista supera el umbral; debajo de eso, render directo para que las
// transitions y :focus dentro de cada fila funcionen sin gymnastics.
// Asume altura fija por fila (itemHeight). Para alturas variables, usar
// observación de tamaños (no implementado: no se necesita aún).

const props = defineProps({
  source: { type: Array, required: true },
  itemHeight: { type: Number, required: true },
  maxHeight: { type: Number, default: 600 },
  threshold: { type: Number, default: 30 },
  overscan: { type: Number, default: 5 },
  keyField: { type: String, default: 'id' },
})

const containerEl = ref(null)

const shouldVirtualize = computed(() => props.source.length >= props.threshold)

function getKey(item, idx) {
  return item?.[props.keyField] ?? idx
}

const sourceRef = computed(() => props.source)
const maxHeightRef = computed(() => props.maxHeight)

const { items: visibleItems, totalHeight, offsetY, onScroll } = useVirtualList({
  source: sourceRef,
  itemHeight: props.itemHeight,
  containerHeight: maxHeightRef,
  overscan: props.overscan,
  getKey,
})
</script>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  contain: strict;
}
</style>
