/**
 * Pull-to-refresh composable para PWA mÃ³vil.
 * Uso: const { PullToRefresh } = usePullToRefresh(onRefresh)
 * Agrega el componente <PullToRefresh /> al inicio del contenido.
 */
export function usePullToRefresh(onRefresh) {
  const isRefreshing = ref(false)
  const pullDistance = ref(0)
  const THRESHOLD = 70 // px mÃ­nimos para disparar refresh
  const { isModalOpen } = useModalLayer()

  let startY = 0
  let isPulling = false

  function onTouchStart(e) {
    if (isModalOpen.value) return

    // Solo activar si estamos al tope del scroll
    if (window.scrollY !== 0) return
    startY = e.touches[0].clientY
    isPulling = true
  }

  function onTouchMove(e) {
    if (isModalOpen.value) {
      isPulling = false
      pullDistance.value = 0
      return
    }

    if (!isPulling || isRefreshing.value) return
    const diff = e.touches[0].clientY - startY
    if (diff > 0) {
      pullDistance.value = Math.min(diff * 0.4, THRESHOLD * 1.2)
      if (pullDistance.value > 5) e.preventDefault()
    } else {
      pullDistance.value = 0
    }
  }

  async function onTouchEnd() {
    if (isModalOpen.value) {
      isPulling = false
      pullDistance.value = 0
      return
    }

    if (!isPulling) return
    isPulling = false

    if (pullDistance.value >= THRESHOLD * 0.8 && !isRefreshing.value) {
      isRefreshing.value = true
      pullDistance.value = 0
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    } else {
      pullDistance.value = 0
    }
  }

  onMounted(() => {
    if (!process.client) return
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    if (!process.client) return
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  })

  return { isRefreshing, pullDistance, threshold: THRESHOLD }
}
