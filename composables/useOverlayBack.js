/**
 * Handles Android/browser back-button for overlays controlled by a reactive boolean.
 * Unlike useModalBack (which relies on component mount/unmount), this works when the
 * overlay visibility is managed by a reactive ref inside a persistent component.
 *
 * @param {import('vue').Ref<boolean>} isVisible - reactive ref controlling overlay visibility
 * @param {Function} closeFn - function to call when back is pressed
 */
export function useOverlayBack(isVisible, closeFn) {
  const historyId = ref(null)

  function onPopState(event) {
    if (isVisible.value && event.state?.__overlayId !== historyId.value) {
      historyId.value = null
      closeFn()
    }
  }

  onMounted(() => {
    if (!process.client) return
    window.addEventListener('popstate', onPopState)
  })

  onUnmounted(() => {
    if (!process.client) return
    window.removeEventListener('popstate', onPopState)
  })

  watch(isVisible, (val, oldVal) => {
    if (!process.client) return
    if (val && !oldVal) {
      const id = `overlay-${Math.random().toString(36).slice(2, 9)}`
      const current = window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
      window.history.pushState({ ...current, __overlayId: id }, '', window.location.href)
      historyId.value = id
    } else if (!val && oldVal && historyId.value) {
      if (window.history.state?.__overlayId === historyId.value) {
        window.history.back()
      }
      historyId.value = null
    }
  })
}
