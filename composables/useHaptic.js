export function useHaptic() {
  function vibrate(pattern = 10) {
    if (import.meta.client && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }

  return { vibrate }
}
