/**
 * Detecta swipe horizontal para navegar entre meses.
 * @param {Function} onPrev - Llamada al deslizar a la derecha (mes anterior)
 * @param {Function} onNext - Llamada al deslizar a la izquierda (mes siguiente)
 * @param {Object} options
 * @param {number} options.threshold - Píxeles mínimos para disparar (default 60)
 * @param {number} options.verticalTolerance - Máximo deslizamiento vertical permitido (default 50)
 */
export function useSwipeMonth(onPrev, onNext, options = {}) {
  const { threshold = 60, verticalTolerance = 50 } = options

  let startX = 0
  let startY = 0
  let isTracking = false

  function onTouchStart(e) {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    isTracking = true
  }

  function onTouchEnd(e) {
    if (!isTracking) return
    isTracking = false

    const diffX = e.changedTouches[0].clientX - startX
    const diffY = Math.abs(e.changedTouches[0].clientY - startY)

    // Ignorar si el gesto fue más vertical que horizontal
    if (diffY > verticalTolerance) return

    if (diffX > threshold) {
      onPrev()
    } else if (diffX < -threshold) {
      onNext()
    }
  }

  function attach(el) {
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  }

  function detach(el) {
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchend', onTouchEnd)
  }

  return { attach, detach }
}
