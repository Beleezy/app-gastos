import { onMounted, onUnmounted } from 'vue'

const MODAL_STATE_KEY = '__modalId'
const CLEANUP_SUPPRESS_MS = 600

let cleanupPopDeadline = 0
let cleanupTimer = null

function getCleanHistoryState() {
  const currentState =
    window.history.state && typeof window.history.state === 'object'
      ? { ...window.history.state }
      : {}

  delete currentState[MODAL_STATE_KEY]
  return currentState
}

export function markCleanupPopPending() {
  cleanupPopDeadline = Date.now() + CLEANUP_SUPPRESS_MS

  if (cleanupTimer) clearTimeout(cleanupTimer)
  cleanupTimer = setTimeout(() => {
    cleanupPopDeadline = 0
    cleanupTimer = null
  }, CLEANUP_SUPPRESS_MS)
}

export function consumeCleanupPop() {
  if (!cleanupPopDeadline || Date.now() > cleanupPopDeadline) return false

  cleanupPopDeadline = 0
  if (cleanupTimer) {
    clearTimeout(cleanupTimer)
    cleanupTimer = null
  }
  return true
}

export function useModalBack(closeCallback) {
  let modalStateId = null
  let closedFromHistory = false

  const handlePopState = (event) => {
    if (event.state?.[MODAL_STATE_KEY] === modalStateId) return

    if (consumeCleanupPop()) {
      // If a previously closed modal had a pending history.back(), keep this
      // newly opened modal armed instead of closing it with that stale popstate.
      if (window.history.state?.[MODAL_STATE_KEY] !== modalStateId) {
        window.history.pushState(
          { ...getCleanHistoryState(), [MODAL_STATE_KEY]: modalStateId },
          '',
          window.location.href,
        )
      }
      return
    }

    closedFromHistory = true
    closeCallback()
  }

  onMounted(() => {
    if (!import.meta.client) return

    modalStateId = `modal-${Math.random().toString(36).slice(2, 9)}`

    const currentState = getCleanHistoryState()
    if (window.history.state?.[MODAL_STATE_KEY]) {
      window.history.replaceState(currentState, '', window.location.href)
    }

    window.history.pushState(
      { ...currentState, [MODAL_STATE_KEY]: modalStateId },
      '',
      window.location.href,
    )
    window.addEventListener('popstate', handlePopState)
  })

  onUnmounted(() => {
    if (!import.meta.client) return

    window.removeEventListener('popstate', handlePopState)

    if (!closedFromHistory && window.history.state?.[MODAL_STATE_KEY] === modalStateId) {
      markCleanupPopPending()
      window.history.back()
    }
  })
}
