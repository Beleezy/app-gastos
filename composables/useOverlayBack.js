import { markCleanupPopPending, consumeCleanupPop } from './useModalBack'
import { useModalLayer } from './useModalLayer'

/**
 * Handles Android/browser back-button for overlays controlled by a reactive boolean.
 * Unlike useModalBack (which relies on component mount/unmount), this works when the
 * overlay visibility is managed by a reactive ref inside a persistent component.
 *
 * Además bloquea el scroll del body mientras el overlay está visible (vía
 * useModalLayer), para que al hacer scroll se mueva el contenido del modal y no la
 * página de fondo.
 *
 * @param {import('vue').Ref<boolean>} isVisible - reactive ref controlling overlay visibility
 * @param {Function} closeFn - function to call when back is pressed
 */
export function useOverlayBack(isVisible, closeFn) {
  const historyId = ref(null)
  const { registerModal, unregisterModal } = useModalLayer()
  let scrollLocked = false

  function lockScroll() {
    if (scrollLocked) return
    scrollLocked = true
    registerModal()
  }

  function unlockScroll() {
    if (!scrollLocked) return
    scrollLocked = false
    unregisterModal()
  }

  function onPopState(event) {
    if (!isVisible.value) return
    if (event.state?.__overlayId === historyId.value) return

    // Un overlay hermano que acaba de cerrarse pudo haber disparado un history.back()
    // cuyo popstate llega justo después de que ESTE overlay se abrió (p.ej. transición
    // overlay → overlay). En ese caso no cerramos: re-armamos la entrada de history.
    if (consumeCleanupPop()) {
      if (window.history.state?.__overlayId !== historyId.value) {
        const current =
          window.history.state && typeof window.history.state === 'object'
            ? window.history.state
            : {}
        window.history.pushState(
          { ...current, __overlayId: historyId.value },
          '',
          window.location.href,
        )
      }
      return
    }

    historyId.value = null
    closeFn()
  }

  onMounted(() => {
    if (!import.meta.client) return
    window.addEventListener('popstate', onPopState)
    if (isVisible.value) lockScroll()
  })

  onUnmounted(() => {
    if (!import.meta.client) return
    window.removeEventListener('popstate', onPopState)
    unlockScroll()
  })

  watch(isVisible, (val, oldVal) => {
    if (!import.meta.client) return
    if (val && !oldVal) {
      const id = `overlay-${Math.random().toString(36).slice(2, 9)}`
      const current =
        window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
      window.history.pushState({ ...current, __overlayId: id }, '', window.location.href)
      historyId.value = id
      lockScroll()
    } else if (!val && oldVal) {
      unlockScroll()
      if (historyId.value) {
        if (window.history.state?.__overlayId === historyId.value) {
          // Arm the cleanup window so that a modal/overlay mounted right after this
          // (e.g. overlay → modal transition) isn't closed by the stale popstate
          // that this history.back() is about to dispatch.
          markCleanupPopPending()
          window.history.back()
        }
        historyId.value = null
      }
    }
  })
}
