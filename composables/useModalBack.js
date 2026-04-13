import { onMounted, onUnmounted } from 'vue'

export function useModalBack(closeCallback) {
  let modalStateId = null
  let closedFromHistory = false

  const handlePopState = (event) => {
    if (event.state?.__modalId === modalStateId) return

    closedFromHistory = true
    closeCallback()
  }

  onMounted(() => {
    if (!process.client) return

    modalStateId = `modal-${Math.random().toString(36).slice(2, 9)}`

    const currentState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {}

    window.history.pushState({ ...currentState, __modalId: modalStateId }, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
  })

  onUnmounted(() => {
    if (!process.client) return

    window.removeEventListener('popstate', handlePopState)

    if (!closedFromHistory && window.history.state?.__modalId === modalStateId) {
      window.history.back()
    }
  })
}
