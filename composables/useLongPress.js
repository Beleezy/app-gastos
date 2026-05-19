/**
 * Long-press detector para móvil y desktop.
 *
 * Devuelve handlers para `@mousedown` / `@touchstart` / `@mouseup` / `@mouseleave`
 * / `@touchend` / `@touchmove` que disparan `onLongPress` cuando el usuario
 * mantiene presionado durante `delay` ms sin moverse más de `moveTolerance` px.
 *
 * Se cancela en:
 *  - mouseup / touchend antes de cumplir delay
 *  - mouseleave del elemento
 *  - touchmove con desplazamiento > moveTolerance (scroll inadvertido)
 *
 * Si `onLongPress` se dispara, también vibra cortamente para feedback.
 */
export function useLongPress({
  onLongPress,
  delay = 500,
  moveTolerance = 10,
  preventClick = true,
} = {}) {
  const { vibrate } = useHaptic()
  let timer = null
  let startX = 0
  let startY = 0
  let triggered = false

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function start(e) {
    triggered = false
    const point = e.touches ? e.touches[0] : e
    startX = point.clientX
    startY = point.clientY
    cancel()
    timer = setTimeout(() => {
      triggered = true
      timer = null
      vibrate(20)
      if (typeof onLongPress === 'function') onLongPress(e)
    }, delay)
  }

  function move(e) {
    if (!timer) return
    const point = e.touches ? e.touches[0] : e
    const dx = Math.abs(point.clientX - startX)
    const dy = Math.abs(point.clientY - startY)
    if (dx > moveTolerance || dy > moveTolerance) cancel()
  }

  function end() {
    cancel()
  }

  function onClickCapture(e) {
    // Si el long-press se disparó, evitar que el click siguiente abra otra acción.
    if (triggered && preventClick) {
      e.preventDefault()
      e.stopPropagation()
      triggered = false
    }
  }

  return {
    listeners: {
      onMousedown: start,
      onMouseup: end,
      onMouseleave: end,
      onTouchstart: start,
      onTouchend: end,
      onTouchmove: move,
      onTouchcancel: end,
      onClickCapture,
    },
    cancel,
  }
}
