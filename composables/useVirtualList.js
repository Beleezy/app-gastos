/**
 * Virtualización mínima para listas largas.
 * Ver §2.3 de planifica.md.
 *
 * Calcula el rango de items visibles en función del scrollTop del
 * contenedor y la altura fija de cada fila. No depende de librerías
 * externas; suficiente para listas de hasta ~10.000 items.
 *
 * Uso:
 *   const containerRef = ref(null)
 *   const { items, totalHeight, offsetY, onScroll } = useVirtualList({
 *     source: gastos,
 *     itemHeight: 56,
 *     containerHeight: ref(600),
 *     overscan: 5,
 *   })
 *
 *   <div ref="containerRef" :style="{ height: containerHeight + 'px', overflow: 'auto' }" @scroll="onScroll">
 *     <div :style="{ height: totalHeight + 'px', position: 'relative' }">
 *       <div :style="{ transform: `translateY(${offsetY}px)` }">
 *         <Row v-for="i in items" :key="i.key" :data="i.item" />
 *       </div>
 *     </div>
 *   </div>
 */

export function useVirtualList({ source, itemHeight, containerHeight, overscan = 3, getKey } = {}) {
  if (!itemHeight || itemHeight <= 0) {
    throw new Error('useVirtualList: itemHeight requerido y > 0')
  }

  const scrollTop = ref(0)

  const totalHeight = computed(() => {
    const arr = unref(source) || []
    return arr.length * itemHeight
  })

  const visibleCount = computed(() => {
    const h = unref(containerHeight) || 0
    return Math.max(1, Math.ceil(h / itemHeight))
  })

  const startIndex = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan)
  })

  const endIndex = computed(() => {
    const arr = unref(source) || []
    return Math.min(arr.length, startIndex.value + visibleCount.value + overscan * 2)
  })

  const items = computed(() => {
    const arr = unref(source) || []
    const out = []
    for (let i = startIndex.value; i < endIndex.value; i++) {
      const item = arr[i]
      const key = typeof getKey === 'function' ? getKey(item, i) : (item?.id ?? i)
      out.push({ key, item, index: i })
    }
    return out
  })

  const offsetY = computed(() => startIndex.value * itemHeight)

  function onScroll(event) {
    scrollTop.value = event?.target?.scrollTop ?? 0
  }

  function scrollToIndex(index, container) {
    const target = container || event?.target
    if (!target) return
    target.scrollTop = Math.max(0, index * itemHeight)
  }

  return {
    items,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    visibleCount,
    scrollTop,
    onScroll,
    scrollToIndex,
  }
}

/**
 * Helper puro para tests / fuera de Nuxt.
 * Devuelve el rango de índices visibles dado scrollTop, itemHeight y
 * containerHeight.
 */
export function calcularRango({ scrollTop, itemHeight, containerHeight, total, overscan = 3 }) {
  if (!itemHeight || itemHeight <= 0) return { startIndex: 0, endIndex: 0, visibleCount: 0 }
  const visibleCount = Math.max(1, Math.ceil(containerHeight / itemHeight))
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(total, startIndex + visibleCount + overscan * 2)
  return { startIndex, endIndex, visibleCount }
}
