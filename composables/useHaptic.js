export function useHaptic() {
  function vibrate(pattern = 10) {
    if (process.client && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }

  return { vibrate }
}
